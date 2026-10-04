import { expect, test } from "bun:test";
import { validateSourceImports } from "../lib/source-import-policy";
import { discoverWorkspaces } from "../lib/workspaces";
import { addWorkspace, temporaryRepository, writeSource } from "./helpers";

async function issuesFor(root: string) {
	return await validateSourceImports({
		repositoryRoot: root,
		workspaces: await discoverWorkspaces(root),
	});
}

test("declared package root and export subpath imports are accepted", async () => {
	const root = await temporaryRepository();
	await addWorkspace(root, {
		exports: {
			".": "./dist/index.js",
			"./reading": "./dist/reading.js",
		},
		kind: "battery",
		name: "dumling",
	});
	const consumer = await addWorkspace(root, {
		dependencies: { dumling: "workspace:^" },
		kind: "app",
		name: "docs",
	});
	await writeSource(
		consumer,
		"src/index.ts",
		'import { x } from "dumling";\n' +
			'import { y } from "dumling/reading";\n' +
			"const example = 'import { hidden } from \"dumling/internal\"';\n",
	);

	expect(await issuesFor(root)).toEqual([]);
});

test("undeclared subpaths and cross-workspace filesystem imports are rejected", async () => {
	const root = await temporaryRepository();
	const library = await addWorkspace(root, {
		kind: "battery",
		name: "dumling",
	});
	const consumer = await addWorkspace(root, {
		dependencies: { dumling: "workspace:^" },
		kind: "app",
		name: "docs",
	});
	await writeSource(library, "src/internal.ts", "export const x = 1;\n");
	await writeSource(
		consumer,
		"src/index.ts",
		'import { x } from "dumling/src/internal";\n' +
			'import { y } from "../../../battery/dumling/src/internal";\n',
	);

	const issues = await issuesFor(root);

	expect(issues.some((issue) => issue.message.includes("#exports"))).toBe(
		true,
	);
	expect(
		issues.some((issue) =>
			issue.message.includes("relative/filesystem import"),
		),
	).toBe(true);
});

test("battery to app imports and cross-workspace cycles are rejected", async () => {
	const root = await temporaryRepository();
	const app = await addWorkspace(root, {
		dependencies: { core: "workspace:^" },
		kind: "app",
		name: "product",
	});
	const battery = await addWorkspace(root, {
		dependencies: { product: "workspace:^" },
		kind: "battery",
		name: "core",
	});
	await writeSource(app, "src/index.ts", 'import "core";\n');
	await writeSource(battery, "src/index.ts", 'import "product";\n');

	const issues = await issuesFor(root);

	expect(
		issues.some((issue) =>
			issue.message.includes("batteries cannot import apps"),
		),
	).toBe(true);
	expect(
		issues.some((issue) => issue.message.includes("cross-workspace cycle")),
	).toBe(true);
});

test("operational source cannot import Dum schema-authoring surfaces through any TypeScript import form", async () => {
	const root = await temporaryRepository();
	const dumgen = await addWorkspace(root, {
		exports: {
			".": "./dist/index.js",
			"./dangerously-heavy-schema-tree": "./dist/danger.js",
			"./model-authoring": "./dist/model-authoring.js",
			"./schema": "./dist/schema.js",
		},
		kind: "battery",
		name: "dumgen",
	});
	const consumer = await addWorkspace(root, {
		dependencies: { dumgen: "workspace:^" },
		kind: "app",
		name: "product",
	});
	await writeSource(
		consumer,
		"src/index.ts",
		'import "dumgen/schema";\n' +
			'import "dumgen/dangerously-heavy-schema-tree";\n' +
			'import "dumgen/model-authoring";\n' +
			'import type { Model } from "dumgen/schema";\n' +
			'export { schema } from "dumgen/schema";\n' +
			'export type { Model } from "dumgen/model-authoring";\n' +
			'type Schema = import("dumgen/dangerously-heavy-schema-tree").Schema;\n' +
			'void import("dumgen/schema");\n' +
			'require("dumgen/model-authoring");\n' +
			'import heavy = require("dumgen/dangerously-heavy-schema-tree");\n' +
			'export import authoring = require("dumgen/model-authoring");\n',
	);
	await writeSource(
		dumgen,
		"src/runtime.ts",
		'import type { Model } from "dumgen/schema";\n',
	);

	const issues = await issuesFor(root);

	expect(issues).toHaveLength(12);
	for (const issue of issues) {
		expect(issue.message).toContain(
			"operational source cannot import schema-authoring surfaces",
		);
	}
});

test("ordinary app tests and nested runtime docs cannot hide schema imports", async () => {
	const root = await temporaryRepository();
	await addWorkspace(root, {
		exports: {
			".": "./dist/index.js",
			"./dangerously-heavy-schema-tree": "./dist/danger.js",
			"./schema": "./dist/schema.js",
		},
		kind: "battery",
		name: "dumrel",
	});
	const consumer = await addWorkspace(root, {
		dependencies: { dumrel: "workspace:^" },
		kind: "app",
		name: "product",
	});
	await writeSource(
		consumer,
		"tests/runtime.test.ts",
		'import "dumrel/schema";\n',
	);
	await writeSource(
		consumer,
		"src/docs/runtime.ts",
		'import "dumrel/dangerously-heavy-schema-tree";\n',
	);

	const issues = await issuesFor(root);

	expect(issues).toHaveLength(2);
	expect(
		issues.every((issue) => issue.message.includes("operational source")),
	).toBe(true);
});

test("tests and package code generators may import explicit schema-authoring surfaces", async () => {
	const root = await temporaryRepository();
	await addWorkspace(root, {
		exports: {
			".": "./dist/index.js",
			"./dangerously-heavy-schema-tree": "./dist/danger.js",
			"./schema": "./dist/schema.js",
		},
		kind: "battery",
		name: "dumling",
	});
	const app = await addWorkspace(root, {
		dependencies: { dumling: "workspace:^" },
		kind: "app",
		name: "docs",
	});
	const battery = await addWorkspace(root, {
		dependencies: { dumling: "workspace:^" },
		kind: "battery",
		name: "consumer",
	});
	await writeSource(
		app,
		"tests/schema.test.ts",
		'import "dumling/dangerously-heavy-schema-tree";\n',
	);
	await writeSource(
		battery,
		"codegen/artifacts.ts",
		'import "dumling/schema";\n',
	);

	expect(await issuesFor(root)).toEqual([]);
});

async function tfDemoFixture() {
	const root = await temporaryRepository();
	const app = await addWorkspace(root, {
		kind: "app",
		name: "@texteater/tf-demo",
	});
	await writeSource(
		app,
		"tsconfig.json",
		'{\n\t// tf-demo maps `@/` to its src folder\n\t"compilerOptions": { "paths": { "@/*": ["./src/*"] } }\n}\n',
	);
	await writeSource(
		app,
		"src/notes/index.ts",
		"export const renderNote = 1;\n",
	);
	await writeSource(
		app,
		"src/notes/universal/note/render.tsx",
		"export const renderUniversalNote = 1;\n",
	);
	await writeSource(
		app,
		"convex/dumdictStorage/queries.ts",
		"export type Slice = { revision: string };\n",
	);
	await writeSource(
		app,
		"convex/model/validators.ts",
		"export const storedUnitValidator = {};\n",
	);
	return { root, app };
}

test("tf-demo's boundary rules see alias, type-only and tooling imports", async () => {
	const { root, app } = await tfDemoFixture();
	await writeSource(
		app,
		"src/views/root-only.tsx",
		'import { renderNote } from "@/notes";\n',
	);
	await writeSource(
		app,
		"src/views/deep.tsx",
		'import { renderUniversalNote } from "@/notes/universal/note/render";\n',
	);
	await writeSource(
		app,
		"tests/storage.test.ts",
		'import type { Slice } from "../convex/dumdictStorage/queries";\n',
	);
	await writeSource(
		app,
		"tooling/snapshot.ts",
		'import { renderUniversalNote } from "../src/notes/universal/note/render";\n',
	);

	const issues = await issuesFor(root);

	expect(
		issues
			.map(({ file, message }) => [file, message.split(":")[0]])
			.sort(([left = ""], [right = ""]) => left.localeCompare(right)),
	).toEqual([
		[
			"app/tf-demo/src/views/deep.tsx",
			"tf-demo-notes-hide-their-internals",
		],
		[
			"app/tf-demo/tests/storage.test.ts",
			"tf-demo-dumdict-storage-implementation-is-private",
		],
		[
			"app/tf-demo/tooling/snapshot.ts",
			"tf-demo-notes-hide-their-internals",
		],
	]);
});

test("tf-demo's server may name a Convex type but not load a Convex module, and generated code is exempt", async () => {
	const { root, app } = await tfDemoFixture();
	await writeSource(
		app,
		"server/type-only.ts",
		'import type { storedUnitValidator } from "../convex/model/validators";\n',
	);
	await writeSource(
		app,
		"server/value.ts",
		'import { storedUnitValidator } from "../convex/model/validators";\n',
	);
	await writeSource(
		app,
		"server/inline-type.ts",
		'import { type storedUnitValidator } from "../convex/model/validators";\n',
	);
	await writeSource(
		app,
		"convex/_generated/api.d.ts",
		'import type * as queries from "../dumdictStorage/queries.js";\n',
	);

	const issues = await issuesFor(root);

	expect(issues.map(({ file }) => file).sort()).toEqual([
		"app/tf-demo/server/inline-type.ts",
		"app/tf-demo/server/value.ts",
	]);
	for (const issue of issues)
		expect(issue.message).toStartWith(
			"tf-demo-server-does-not-import-convex",
		);
});

test("only generators, scripts and tests may load dumling/codegen", async () => {
	const root = await temporaryRepository();
	const dumling = await addWorkspace(root, {
		exports: {
			".": "./dist/index.js",
			"./codegen": "./codegen/index.ts",
		},
		kind: "battery",
		name: "dumling",
	});
	const consumer = await addWorkspace(root, {
		dependencies: { dumling: "workspace:^" },
		kind: "battery",
		name: "dumrel",
	});
	await writeSource(
		dumling,
		"codegen/index.ts",
		"export const routes = [];\n",
	);
	for (const path of [
		"codegen/generate.ts",
		"scripts/report.ts",
		"tests/routes.test.ts",
	])
		await writeSource(consumer, path, 'import "dumling/codegen";\n');
	await writeSource(
		consumer,
		"src/types.ts",
		'import type { DumlingRoute } from "dumling/codegen";\n',
	);
	await writeSource(consumer, "src/index.ts", 'import "dumling/codegen";\n');
	await writeSource(
		dumling,
		"src/index.ts",
		'import { routes } from "../codegen/index";\n',
	);

	const issues = await issuesFor(root);

	expect(
		issues.map(({ file, message }) => [file, message.split(":")[0]]),
	).toEqual([
		[
			"battery/dumling/src/index.ts",
			"dumling-runtime-does-not-import-codegen",
		],
		[
			"battery/dumrel/src/index.ts",
			"only code generators, scripts and tests may load a codegen-only entry",
		],
	]);
});
