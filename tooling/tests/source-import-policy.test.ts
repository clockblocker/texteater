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
