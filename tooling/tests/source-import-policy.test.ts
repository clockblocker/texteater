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
			"./schema": "./dist/schema.js",
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
			'import { y } from "dumling/schema";\n' +
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
