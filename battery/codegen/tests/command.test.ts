import { afterEach, beforeEach, expect, spyOn, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { CodegenDriftError } from "../src/errors.js";
import { defineCodegen, runCodegenCommand } from "../src/index.js";

let directory: string;
let logged: string[];
let errored: string[];
let restoreConsole: () => void;

beforeEach(async () => {
	directory = await mkdtemp(join(tmpdir(), "codegen-command-"));
	logged = [];
	errored = [];
	const log = spyOn(console, "log").mockImplementation((line: string) => {
		logged.push(line);
	});
	const error = spyOn(console, "error").mockImplementation((line: string) => {
		errored.push(line);
	});
	restoreConsole = () => {
		log.mockRestore();
		error.mockRestore();
	};
});

afterEach(async () => {
	restoreConsole();
	await rm(directory, { recursive: true, force: true });
});

function recipe(files: Readonly<Record<string, string>>) {
	return defineCodegen({
		inputs: {},
		outputs: { generated: { root: directory } },
		build: () =>
			Object.entries(files).map(([path, content]) => ({
				id: path,
				to: { target: "generated" as const, path },
				content,
				provenance: [],
				meta: null,
			})),
	});
}

const files = {
	"a.ts": "export const a = 1;\n",
	"b.ts": "export const b = 2;\n",
};

test("without --check it writes every artifact and reports the count", async () => {
	const run = await runCodegenCommand(recipe(files), {
		argv: ["bun", "generate.ts"],
		label: "demo",
	});

	expect(run.mode).toBe("write");
	expect(run.status).toBe("changed");
	expect(await readFile(join(directory, "a.ts"), "utf8")).toBe(files["a.ts"]);
	expect(await readFile(join(directory, "b.ts"), "utf8")).toBe(files["b.ts"]);
	expect(logged).toEqual(["demo: Generated 2 files"]);
	expect(errored).toEqual([]);
});

test("--check on a clean tree verifies without writing", async () => {
	await runCodegenCommand(recipe(files), { argv: [] });
	logged = [];

	const run = await runCodegenCommand(recipe(files), {
		argv: ["bun", "generate.ts", "--check"],
	});

	expect(run.mode).toBe("check");
	expect(run.status).toBe("clean");
	expect(run.applied).toEqual([]);
	expect(logged).toEqual(["Verified 2 files"]);
	expect(errored).toEqual([]);
});

test("--check on a stale tree lists every stale file and throws", async () => {
	await writeFile(join(directory, "a.ts"), "export const a = 0;\n");

	const failure = runCodegenCommand(recipe(files), {
		argv: ["--check"],
		label: "demo",
	});

	await expect(failure).rejects.toBeInstanceOf(CodegenDriftError);
	await expect(failure).rejects.toThrow(
		"demo: 2 generated files are out of date; run bun run generate",
	);
	expect(errored).toEqual([
		`update ${relative(process.cwd(), join(directory, "a.ts"))}`,
		`create ${relative(process.cwd(), join(directory, "b.ts"))}`,
	]);
	expect(logged).toEqual([]);
	expect(await readFile(join(directory, "a.ts"), "utf8")).toBe(
		"export const a = 0;\n",
	);
});
