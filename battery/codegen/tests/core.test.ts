import { expect, test } from "bun:test";
import {
	mkdir,
	mkdtemp,
	readFile,
	rm,
	symlink,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import {
	CodegenOwnershipError,
	CodegenPlanError,
	defineCodegen,
	runCodegen,
} from "../src/index.js";
import { runCodegenWithFileSystem } from "../src/runner.js";
import { MemoryFileSystem } from "./memory-filesystem.js";

test("check is mutation-free and write skips unchanged artifacts", async () => {
	const fileSystem = new MemoryFileSystem({
		"/workspace/input/b.txt": "bravo",
		"/workspace/input/a.txt": "alpha",
	});
	const recipe = defineCodegen({
		inputs: {
			sources: {
				kind: "text-set",
				root: "/workspace/input",
				include: ["*.txt"],
			},
		},
		outputs: {
			generated: { root: "/workspace/output" },
		},
		build: ({ sources }) => [
			{
				id: "joined",
				to: { target: "generated", path: "joined.txt" },
				content: sources
					.map(
						(source) =>
							`${basename(source.source.path)}=${source.text}`,
					)
					.join("\n"),
				provenance: sources.map((source) => source.source),
				meta: { kind: "joined" },
			},
		],
	});

	const checked = await runCodegenWithFileSystem(
		recipe,
		{ mode: "check" },
		fileSystem,
	);
	expect(checked.status).toBe("changed");
	expect(checked.applied).toEqual([]);
	expect(fileSystem.mutations).toEqual([]);

	const written = await runCodegenWithFileSystem(
		recipe,
		{ mode: "write" },
		fileSystem,
	);
	expect(written.status).toBe("changed");
	expect(fileSystem.text("/workspace/output/joined.txt")).toBe(
		"a.txt=alpha\nb.txt=bravo",
	);

	fileSystem.clearMutations();
	const repeated = await runCodegenWithFileSystem(
		recipe,
		{ mode: "write" },
		fileSystem,
	);
	expect(repeated.status).toBe("clean");
	expect(repeated.applied).toEqual([]);
	expect(fileSystem.mutations).toEqual([]);
});

test("collisions fail before any filesystem mutation", async () => {
	const fileSystem = new MemoryFileSystem();
	const recipe = defineCodegen({
		inputs: {},
		outputs: { generated: { root: "/workspace/output" } },
		build: () => [
			{
				id: "first",
				to: { target: "generated", path: "same.txt" },
				content: "one",
				provenance: [{ kind: "source", path: "one.ts" }],
				meta: null,
			},
			{
				id: "second",
				to: { target: "generated", path: "same.txt" },
				content: "two",
				provenance: [{ kind: "source", path: "two.ts", line: 7 }],
				meta: null,
			},
		],
	});

	await expect(
		runCodegenWithFileSystem(recipe, { mode: "write" }, fileSystem),
	).rejects.toThrow(CodegenPlanError);
	await expect(
		runCodegenWithFileSystem(recipe, { mode: "write" }, fileSystem),
	).rejects.toThrow(/one\.ts.*two\.ts:7/);
	expect(fileSystem.mutations).toEqual([]);
});

test("file and directory collisions fail before any filesystem mutation", async () => {
	const fileSystem = new MemoryFileSystem();
	const recipe = defineCodegen({
		inputs: {},
		outputs: { generated: { root: "/workspace/output" } },
		build: () => [
			{
				id: "parent-file",
				to: { target: "generated", path: "nested" },
				content: "one",
				provenance: [{ kind: "source", path: "parent.ts" }],
				meta: null,
			},
			{
				id: "intervening-file",
				to: { target: "generated", path: "nested-sibling" },
				content: "middle",
				provenance: [{ kind: "source", path: "middle.ts" }],
				meta: null,
			},
			{
				id: "nested-file",
				to: { target: "generated", path: "nested/child.txt" },
				content: "two",
				provenance: [{ kind: "source", path: "child.ts" }],
				meta: null,
			},
		],
	});

	await expect(
		runCodegenWithFileSystem(recipe, { mode: "write" }, fileSystem),
	).rejects.toThrow(/conflicting destinations.*parent\.ts.*child\.ts/);
	expect(fileSystem.mutations).toEqual([]);
});

test("filesystem-equivalent artifact paths fail before mutation", async () => {
	const fileSystem = new MemoryFileSystem();
	const recipe = defineCodegen({
		inputs: {},
		outputs: { generated: { root: "/workspace/output" } },
		build: () => [
			{
				id: "upper-case",
				to: { target: "generated", path: "Case.txt" },
				content: "upper",
				provenance: [],
				meta: null,
			},
			{
				id: "lower-case",
				to: { target: "generated", path: "case.txt" },
				content: "lower",
				provenance: [],
				meta: null,
			},
		],
	});

	await expect(
		runCodegenWithFileSystem(recipe, { mode: "write" }, fileSystem),
	).rejects.toThrow(/conflicting destinations/);
	expect(fileSystem.mutations).toEqual([]);
});

test("case-only ownership transitions fail before mutation", async () => {
	const fileSystem = new MemoryFileSystem({
		"/workspace/output/Old.txt": "old",
		"/workspace/state/owned.json": '{"version":1,"files":["Old.txt"]}\n',
	});
	const recipe = defineCodegen({
		inputs: {},
		outputs: {
			generated: {
				root: "/workspace/output",
				ownership: {
					manifest: "/workspace/state/owned.json",
				},
			},
		},
		build: () => [
			{
				id: "new-case",
				to: { target: "generated", path: "old.txt" },
				content: "new",
				provenance: [],
				meta: null,
			},
		],
	});

	await expect(
		runCodegenWithFileSystem(recipe, { mode: "write" }, fileSystem),
	).rejects.toThrow(/Stale owned file.*planned artifact/);
	expect(fileSystem.text("/workspace/output/Old.txt")).toBe("old");
	expect(fileSystem.mutations).toEqual([]);
});

test("artifact and manifest path conflicts fail before mutation", async () => {
	const fileSystem = new MemoryFileSystem();
	const recipe = defineCodegen({
		inputs: {},
		outputs: {
			generated: {
				root: "/workspace/output",
				ownership: { manifest: "state/manifest.json" },
			},
		},
		build: () => [
			{
				id: "state-file",
				to: { target: "generated", path: "state" },
				content: "state",
				provenance: [],
				meta: null,
			},
		],
	});

	await expect(
		runCodegenWithFileSystem(recipe, { mode: "write" }, fileSystem),
	).rejects.toThrow(/conflicts with ownership manifest/);
	expect(fileSystem.mutations).toEqual([]);
});

test("stale ownership cannot delete another output's manifest", async () => {
	const fileSystem = new MemoryFileSystem({
		"/workspace/output/first.json":
			'{"version":1,"files":["second.json"]}\n',
		"/workspace/output/second.json": '{"version":1,"files":[]}\n',
	});
	const recipe = defineCodegen({
		inputs: {},
		outputs: {
			first: {
				root: "/workspace/output",
				ownership: { manifest: "first.json" },
			},
			second: {
				root: "/workspace/output",
				ownership: { manifest: "second.json" },
			},
		},
		build: () => [],
	});

	await expect(
		runCodegenWithFileSystem(recipe, { mode: "write" }, fileSystem),
	).rejects.toThrow(/conflicts with ownership manifest/);
	expect(fileSystem.mutations).toEqual([]);
});

test("aggregate artifacts derive from the immutable primary plan", async () => {
	const fileSystem = new MemoryFileSystem();
	const recipe = defineCodegen({
		inputs: {},
		outputs: { generated: { root: "/workspace/output" } },
		build: () => [
			{
				id: "page:alpha",
				to: { target: "generated", path: "alpha.txt" },
				content: "alpha",
				provenance: [{ kind: "source", path: "alpha.ts" }],
				meta: { title: "Alpha" },
			},
			{
				id: "page:beta",
				to: { target: "generated", path: "beta.txt" },
				content: "beta",
				provenance: [{ kind: "source", path: "beta.ts" }],
				meta: { title: "Beta" },
			},
		],
		aggregate: (primary) => {
			expect(Object.isFrozen(primary)).toBe(true);
			expect(primary.every((artifact) => Object.isFrozen(artifact))).toBe(
				true,
			);
			return [
				{
					id: "page:index",
					to: { target: "generated", path: "index.txt" },
					content: primary
						.map((artifact) => artifact.meta.title)
						.join("\n"),
					provenance: primary.map((artifact) => ({
						kind: "artifact" as const,
						id: artifact.id,
					})),
					meta: { title: "Index" },
				},
			];
		},
	});

	const run = await runCodegenWithFileSystem(
		recipe,
		{ mode: "write" },
		fileSystem,
	);

	expect(fileSystem.text("/workspace/output/index.txt")).toBe("Alpha\nBeta");
	expect(run.plan.artifacts.at(-1)?.provenance).toEqual([
		{ kind: "artifact", id: "page:alpha" },
		{ kind: "artifact", id: "page:beta" },
	]);
});

test("aggregate callbacks cannot mutate primary artifact state", async () => {
	const fileSystem = new MemoryFileSystem();
	const recipe = defineCodegen({
		inputs: {},
		outputs: { generated: { root: "/workspace/output" } },
		build: () => [
			{
				id: "immutable",
				to: { target: "generated", path: "immutable.txt" },
				content: "original",
				provenance: [],
				meta: new Map([["title", "Original"]]),
			},
		],
		aggregate: (primary) => {
			const artifact = primary[0];
			if (artifact === undefined) {
				throw new Error("Expected a primary artifact.");
			}
			artifact.content.fill("x".charCodeAt(0));
			artifact.meta.set("title", "Mutated");

			expect(new TextDecoder().decode(artifact.content)).toBe("original");
			expect(artifact.meta.get("title")).toBe("Original");
			return [];
		},
	});

	const run = await runCodegenWithFileSystem(
		recipe,
		{ mode: "write" },
		fileSystem,
	);
	const artifact = run.plan.artifacts[0];
	if (artifact === undefined) {
		throw new Error("Expected a planned artifact.");
	}
	artifact.content.fill("x".charCodeAt(0));
	artifact.meta.set("title", "Mutated");

	expect(fileSystem.text("/workspace/output/immutable.txt")).toBe("original");
	expect(new TextDecoder().decode(artifact.content)).toBe("original");
	expect(artifact.meta.get("title")).toBe("Original");
});

test("ownership only deletes stale files named by a prior manifest", async () => {
	const fileSystem = new MemoryFileSystem({
		"/workspace/output/current.txt": "same",
		"/workspace/output/stale.txt": "old",
		"/workspace/output/unowned.txt": "leave me",
		"/workspace/state/owned.json":
			'{\n  "version": 1,\n  "files": [\n    "current.txt",\n    "stale.txt"\n  ]\n}\n',
	});
	const recipe = defineCodegen({
		inputs: {},
		outputs: {
			generated: {
				root: "/workspace/output",
				ownership: {
					manifest: "/workspace/state/owned.json",
				},
			},
		},
		build: () => [
			{
				id: "current",
				to: { target: "generated", path: "current.txt" },
				content: "same",
				provenance: [],
				meta: null,
			},
		],
	});

	await runCodegenWithFileSystem(recipe, { mode: "write" }, fileSystem);

	expect(fileSystem.text("/workspace/output/stale.txt")).toBeUndefined();
	expect(fileSystem.text("/workspace/output/unowned.txt")).toBe("leave me");
	expect(fileSystem.text("/workspace/state/owned.json")).toBe(
		'{\n  "version": 1,\n  "files": [\n    "current.txt"\n  ]\n}\n',
	);
});

test("a missing ownership manifest never authorizes deletion", async () => {
	const fileSystem = new MemoryFileSystem({
		"/workspace/output/unknown.txt": "not owned",
	});
	const recipe = defineCodegen({
		inputs: {},
		outputs: {
			generated: {
				root: "/workspace/output",
				ownership: { manifest: ".dumcodegen/owned.json" },
			},
		},
		build: () => [],
	});

	await runCodegenWithFileSystem(recipe, { mode: "write" }, fileSystem);
	expect(fileSystem.text("/workspace/output/unknown.txt")).toBe("not owned");
	expect(fileSystem.mutations).not.toContain(
		"remove:/workspace/output/unknown.txt",
	);
});

test("initial ownership safely bootstraps an existing generator", async () => {
	const fileSystem = new MemoryFileSystem({
		"/workspace/output/legacy.txt": "previously generated",
		"/workspace/output/unowned.txt": "leave me",
	});
	const recipe = defineCodegen({
		inputs: {},
		outputs: {
			generated: {
				root: "/workspace/output",
				ownership: {
					manifest: "/workspace/state/owned.json",
					initialFiles: ["legacy.txt"],
				},
			},
		},
		build: () => [],
	});

	await runCodegenWithFileSystem(recipe, { mode: "write" }, fileSystem);

	expect(fileSystem.text("/workspace/output/legacy.txt")).toBeUndefined();
	expect(fileSystem.text("/workspace/output/unowned.txt")).toBe("leave me");
	expect(fileSystem.text("/workspace/state/owned.json")).toBe(
		'{\n  "version": 1,\n  "files": []\n}\n',
	);
});

test("unsafe stale paths are rejected before mutation", async () => {
	const fileSystem = new MemoryFileSystem({
		"/workspace/output/.dumcodegen/owned.json":
			'{"version":1,"files":["../outside.txt"]}\n',
	});
	const recipe = defineCodegen({
		inputs: {},
		outputs: {
			generated: {
				root: "/workspace/output",
				ownership: { manifest: ".dumcodegen/owned.json" },
			},
		},
		build: () => [],
	});

	await expect(
		runCodegenWithFileSystem(recipe, { mode: "write" }, fileSystem),
	).rejects.toThrow(CodegenOwnershipError);
	expect(fileSystem.mutations).toEqual([]);
});

test("the Node adapter rejects symlink traversal before stale deletion", async () => {
	const directory = await mkdtemp(join(tmpdir(), "dumcodegen-symlink-"));
	const output = join(directory, "output");
	const outside = join(directory, "outside");
	const victim = join(outside, "victim.txt");
	const manifest = join(directory, "owned.json");
	try {
		await mkdir(output);
		await mkdir(outside);
		await writeFile(victim, "keep me");
		await symlink(outside, join(output, "link"));
		await writeFile(
			manifest,
			'{"version":1,"files":["link/victim.txt"]}\n',
		);
		const recipe = defineCodegen({
			inputs: {},
			outputs: {
				generated: {
					root: output,
					ownership: { manifest },
				},
			},
			build: () => [],
		});

		await expect(runCodegen(recipe, { mode: "write" })).rejects.toThrow(
			/symbolic link/,
		);
		expect(await readFile(victim, "utf8")).toBe("keep me");
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});

test("the Node adapter writes ordinary files and preserves clean output", async () => {
	const directory = await mkdtemp(join(tmpdir(), "dumcodegen-"));
	try {
		const recipe = defineCodegen({
			inputs: {},
			outputs: { generated: { root: directory } },
			build: () => [
				{
					id: "node-boundary",
					to: { target: "generated", path: "nested/output.txt" },
					content: "ordinary TypeScript output\n",
					provenance: [],
					meta: null,
				},
			],
		});

		const first = await runCodegen(recipe, { mode: "write" });
		const second = await runCodegen(recipe, { mode: "write" });
		expect(first.status).toBe("changed");
		expect(second.status).toBe("clean");
		expect(
			await readFile(join(directory, "nested/output.txt"), "utf8"),
		).toBe("ordinary TypeScript output\n");
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});
