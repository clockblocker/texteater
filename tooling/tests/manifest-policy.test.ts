import { expect, test } from "bun:test";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { validateManifestPolicy } from "../lib/manifest-policy";
import { addWorkspace, temporaryRepository, writeJson } from "./helpers";

test("repository policy rejects governed dependency version mismatches", async () => {
	const root = await temporaryRepository();
	const first = await addWorkspace(root, { kind: "battery", name: "first" });
	const second = await addWorkspace(root, {
		kind: "battery",
		name: "second",
	});
	for (const [dir, version] of [
		[first, "2.5.13"],
		[second, "^2.6.0"],
	] as const) {
		const manifest = await Bun.file(join(dir, "package.json")).json();
		manifest.devDependencies = { "@biomejs/biome": version };
		await writeJson(join(dir, "package.json"), manifest);
	}

	const issues = await validateManifestPolicy({
		cwd: root,
		mode: "repository",
	});

	expect(
		issues.some(
			(issue) =>
				issue.location.includes("second") &&
				issue.message.includes("@biomejs/biome must use 2.5.13"),
		),
	).toBe(true);
});

test("repository policy allows package-specific governed peer ranges", async () => {
	const root = await temporaryRepository();
	const first = await addWorkspace(root, { kind: "battery", name: "first" });
	const second = await addWorkspace(root, {
		kind: "battery",
		name: "second",
	});
	const firstManifest = await Bun.file(join(first, "package.json")).json();
	firstManifest.devDependencies = { zod: "3.25.76" };
	firstManifest.peerDependencies = { zod: "^3.25.0 || ^4.0.0" };
	await writeJson(join(first, "package.json"), firstManifest);
	const secondManifest = await Bun.file(join(second, "package.json")).json();
	secondManifest.devDependencies = { zod: "3.25.76" };
	secondManifest.peerDependencies = { zod: "^4.0.0" };
	await writeJson(join(second, "package.json"), secondManifest);

	const issues = await validateManifestPolicy({
		cwd: root,
		mode: "repository",
	});

	expect(issues).toEqual([]);
});

test("repository policy rejects runtime version drift", async () => {
	const root = await temporaryRepository();
	const workspace = await addWorkspace(root, {
		kind: "battery",
		name: "drifted",
	});
	const manifest = await Bun.file(join(workspace, "package.json")).json();
	manifest.engines = { node: "22.x" };
	await writeJson(join(workspace, "package.json"), manifest);

	const issues = await validateManifestPolicy({
		cwd: root,
		mode: "repository",
	});

	expect(issues).toContainEqual({
		location: "battery/drifted/package.json",
		message: "engines.node must be 24.x",
	});
});

test("package policy inspects only the caller workspace", async () => {
	const root = await temporaryRepository();
	const healthy = await addWorkspace(root, {
		kind: "battery",
		name: "healthy",
	});
	const broken = await addWorkspace(root, {
		kind: "battery",
		name: "broken",
	});
	await writeFile(join(broken, "package.json"), "{ definitely broken JSON");

	const issues = await validateManifestPolicy({
		cwd: healthy,
		mode: "package",
	});

	expect(issues).toEqual([]);
});

test("package policy requires build and dev to enter through Turbo", async () => {
	const root = await temporaryRepository();
	const workspace = await addWorkspace(root, {
		kind: "app",
		name: "direct",
	});
	const manifest = await Bun.file(join(workspace, "package.json")).json();
	manifest.scripts.build =
		"bun ../../tooling/manifest-policy.ts package && bun build src/index.ts";
	manifest.scripts.dev = "vite";
	await writeJson(join(workspace, "package.json"), manifest);

	const issues = await validateManifestPolicy({
		cwd: workspace,
		mode: "package",
	});

	expect(issues.map((issue) => issue.message)).toEqual([
		'build must be "turbo run build:package"',
		'dev must be "turbo run dev:package"',
		'dev requires a "dev:package" script for Turbo to run',
	]);
});

test("every workspace and the root run knip through tooling/knip.ts", async () => {
	const root = await temporaryRepository();
	const workspace = await addWorkspace(root, {
		kind: "battery",
		name: "isolated",
	});
	const manifest = await Bun.file(join(workspace, "package.json")).json();
	manifest.scripts.knip = "knip";
	await writeJson(join(workspace, "package.json"), manifest);
	const rootManifest = await Bun.file(join(root, "package.json")).json();
	delete rootManifest.scripts.knip;
	await writeJson(join(root, "package.json"), rootManifest);

	const issues = await validateManifestPolicy({
		cwd: root,
		mode: "repository",
	});

	expect(issues).toEqual([
		{
			location: "package.json",
			message: 'knip must be "bun tooling/knip.ts"',
		},
		{
			location: "battery/isolated/package.json",
			message: 'knip must be "bun ../../tooling/knip.ts"',
		},
	]);
});

test("every workspace runs its tests through the shared test runner", async () => {
	const root = await temporaryRepository();
	const scripts = {
		bare: "bun test",
		lookalike: "bun ../../tooling/run-package-tests.tsx",
		runner: "bun ../../tooling/run-package-tests.ts",
		scoped: "bun ../../tooling/run-package-tests.ts ./tests",
	};
	for (const [name, script] of Object.entries(scripts)) {
		const workspace = await addWorkspace(root, { kind: "battery", name });
		const manifest = await Bun.file(join(workspace, "package.json")).json();
		manifest.scripts.test = script;
		await writeJson(join(workspace, "package.json"), manifest);
	}

	const issues = await validateManifestPolicy({
		cwd: root,
		mode: "repository",
	});

	const message =
		'test must start with "bun ../../tooling/run-package-tests.ts"';
	expect(issues).toEqual([
		{ location: "battery/bare/package.json", message },
		{ location: "battery/lookalike/package.json", message },
	]);
});

test("package policy keeps a source-exporting package on the base checker options", async () => {
	const root = await temporaryRepository();
	await writeJson(join(root, "tooling/typescript/base.json"), {
		compilerOptions: {
			noUncheckedIndexedAccess: true,
			strictNullChecks: true,
		},
	});
	const source = await addWorkspace(root, {
		kind: "battery",
		name: "source",
		exports: {
			".": { convex: "./src/index.ts", default: "./dist/index.js" },
		},
	});
	const built = await addWorkspace(root, { kind: "app", name: "built" });
	for (const dir of [source, built]) {
		await writeJson(join(dir, "tsconfig.json"), {
			extends: "../../tooling/typescript/base.json",
			compilerOptions: {
				jsx: "react-jsx",
				noUncheckedIndexedAccess: false,
				strictNullChecks: true,
			},
		});
	}

	const sourceIssues = await validateManifestPolicy({
		cwd: source,
		mode: "package",
	});
	const builtIssues = await validateManifestPolicy({
		cwd: built,
		mode: "package",
	});

	expect(sourceIssues).toEqual([
		{
			location: "battery/source/tsconfig.json",
			message:
				"compilerOptions.noUncheckedIndexedAccess must keep the base value, because consumers type-check this package's exported source",
		},
	]);
	expect(builtIssues).toEqual([]);
});

test("package policy resolves an unset strict-family base flag through strict", async () => {
	const root = await temporaryRepository();
	await writeJson(join(root, "tooling/typescript/base.json"), {
		compilerOptions: { strict: true },
	});
	const restated = await addWorkspace(root, {
		kind: "battery",
		name: "restated",
		exports: { ".": { convex: "./src/index.ts" } },
	});
	const loosened = await addWorkspace(root, {
		kind: "battery",
		name: "loosened",
		exports: { ".": { convex: "./src/index.ts" } },
	});
	await writeJson(join(restated, "tsconfig.json"), {
		compilerOptions: { noImplicitThis: true, strictNullChecks: true },
	});
	await writeJson(join(loosened, "tsconfig.json"), {
		compilerOptions: { alwaysStrict: false, strictNullChecks: false },
	});

	const restatedIssues = await validateManifestPolicy({
		cwd: restated,
		mode: "package",
	});
	const loosenedIssues = await validateManifestPolicy({
		cwd: loosened,
		mode: "package",
	});

	expect(restatedIssues).toEqual([]);
	expect(loosenedIssues.map((issue) => issue.message)).toEqual([
		"compilerOptions.alwaysStrict must keep the base value, because consumers type-check this package's exported source",
		"compilerOptions.strictNullChecks must keep the base value, because consumers type-check this package's exported source",
	]);
});
