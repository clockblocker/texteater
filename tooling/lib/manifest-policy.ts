import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import {
	discoverWorkspaces,
	findRepositoryRoot,
	type JsonObject,
	readJson,
	stringRecord,
	type Workspace,
	workspaceScope,
} from "./workspaces";

export type PolicyMode = "package" | "repository";

export interface PolicyIssue {
	location: string;
	message: string;
}

const governedDependencies = [
	"zod",
	"typescript",
	"@types/node",
	"bun-types",
	"@biomejs/biome",
	"dependency-cruiser",
	"knip",
	"effect",
] as const;

const requiredWorkspaceScripts = [
	"build",
	"build:package",
	"test",
	"validate",
] as const;

/**
 * Every workspace runs its tests through the shared runner, which gives each
 * run the repository's default per-test timeout (#997). Arguments, such as a
 * test directory, may follow it.
 */
const packageTestRunner = "bun ../../tooling/run-package-tests.ts";

/**
 * Repository-wide checks, by script name and the tooling command behind it.
 * The root runs each over the whole repository; every workspace runs the
 * same command, which scopes its report to that workspace (`bun run knip`
 * in a package, for example).
 */
const repositoryCheckScripts = {
	knip: "tooling/knip.ts",
	"validate:imports": "tooling/validate-repository-architecture.ts",
	"validate:manifests": "tooling/manifest-policy.ts repository",
} as const;

/**
 * Turbo entry points. `build` and `dev` delegate to Turbo so that every
 * workspace dependency is built first; the package-local work lives in the
 * `:package` script that Turbo runs.
 */
const turboEntryScripts = {
	build: "turbo run build:package",
	dev: "turbo run dev:package",
} as const;
const dependencyFields = [
	"dependencies",
	"devDependencies",
	"optionalDependencies",
	"peerDependencies",
] as const;

/**
 * Compiler options that change what type-checks. A consumer checks a
 * sibling's exported source under its own settings, so a package that
 * exports source keeps these at the base values.
 */
const sharedCheckerOptions = [
	"alwaysStrict",
	"exactOptionalPropertyTypes",
	"noFallthroughCasesInSwitch",
	"noImplicitAny",
	"noImplicitOverride",
	"noImplicitReturns",
	"noImplicitThis",
	"noPropertyAccessFromIndexSignature",
	"noUncheckedIndexedAccess",
	"strict",
	"strictBindCallApply",
	"strictBuiltinIteratorReturn",
	"strictFunctionTypes",
	"strictNullChecks",
	"strictPropertyInitialization",
	"useUnknownInCatchVariables",
] as const;

/**
 * The flags `strict` turns on. A config that leaves one of them unset gets
 * its `strict` value.
 */
const strictFamily: ReadonlySet<string> = new Set([
	"alwaysStrict",
	"noImplicitAny",
	"noImplicitThis",
	"strictBindCallApply",
	"strictBuiltinIteratorReturn",
	"strictFunctionTypes",
	"strictNullChecks",
	"strictPropertyInitialization",
	"useUnknownInCatchVariables",
]);

function effectiveOption(options: JsonObject, option: string): unknown {
	if (option in options) return options[option];
	return strictFamily.has(option) ? (options.strict ?? false) : undefined;
}

function add(
	issues: PolicyIssue[],
	location: string,
	condition: boolean,
	message: string,
): void {
	if (!condition) issues.push({ location, message });
}

function validateWorkspaceManifest(
	workspace: Workspace,
	expectedPackageManager: string,
	expectedNodeEngine: string,
): PolicyIssue[] {
	const issues: PolicyIssue[] = [];
	const manifest = workspace.manifest;
	const location = `${workspace.relativePath}/package.json`;
	const scripts = stringRecord(manifest.scripts);
	add(
		issues,
		location,
		typeof manifest.name === "string",
		"name is required",
	);
	add(
		issues,
		location,
		manifest.packageManager === expectedPackageManager,
		`packageManager must be ${expectedPackageManager}`,
	);
	add(
		issues,
		location,
		stringRecord(manifest.engines).node === expectedNodeEngine,
		`engines.node must be ${expectedNodeEngine}`,
	);
	add(issues, location, manifest.type === "module", 'type must be "module"');
	for (const script of requiredWorkspaceScripts) {
		add(
			issues,
			location,
			typeof scripts[script] === "string",
			`script "${script}" is required`,
		);
	}
	add(
		issues,
		location,
		scripts.validate === "bun ../../tooling/validate-package.ts",
		'validate must be "bun ../../tooling/validate-package.ts"',
	);
	if (typeof scripts.test === "string") {
		add(
			issues,
			location,
			scripts.test === packageTestRunner ||
				scripts.test.startsWith(`${packageTestRunner} `),
			`test must start with "${packageTestRunner}"`,
		);
	}
	for (const [script, command] of Object.entries(repositoryCheckScripts)) {
		add(
			issues,
			location,
			scripts[script] === `bun ../../${command}`,
			`${script} must be "bun ../../${command}"`,
		);
	}
	for (const [entry, expected] of Object.entries(turboEntryScripts)) {
		const local = `${entry}:package`;
		if (!scripts[entry] && !scripts[local]) continue;
		add(
			issues,
			location,
			scripts[entry] === expected,
			`${entry} must be "${expected}"`,
		);
		add(
			issues,
			location,
			typeof scripts[local] === "string",
			`${entry} requires a "${local}" script for Turbo to run`,
		);
	}
	for (const script of ["build:package", "run"] as const) {
		if (!scripts[script]) continue;
		add(
			issues,
			location,
			scripts[script].includes(
				"bun ../../tooling/manifest-policy.ts package",
			),
			`${script} must gate on package-mode manifest validation`,
		);
	}
	for (const field of dependencyFields) {
		for (const [name, version] of Object.entries(
			stringRecord(manifest[field]),
		)) {
			if (!version.startsWith("workspace:")) continue;
			add(
				issues,
				location,
				/^workspace:(\*|\^|~)$/.test(version),
				`${field}.${name} must use workspace:*, workspace:^, or workspace:~`,
			);
		}
	}

	if (manifest.private !== true) {
		for (const field of [
			"version",
			"description",
			"license",
			"exports",
			"files",
		] as const) {
			add(
				issues,
				location,
				manifest[field] !== undefined,
				`publishable package requires ${field}`,
			);
		}
		add(
			issues,
			location,
			typeof manifest.version === "string" &&
				/^\d+\.\d+\.\d+([+-].+)?$/.test(manifest.version),
			"publishable package version must be semver",
		);
	}
	return issues;
}

function validateRootManifest(rootManifest: JsonObject): PolicyIssue[] {
	const issues: PolicyIssue[] = [];
	add(
		issues,
		"package.json",
		rootManifest.private === true,
		"repository root must be private",
	);
	add(
		issues,
		"package.json",
		Array.isArray(rootManifest.workspaces) &&
			rootManifest.workspaces.includes("app/*") &&
			rootManifest.workspaces.includes("battery/*"),
		'workspaces must include "app/*" and "battery/*"',
	);
	const rootScripts = stringRecord(rootManifest.scripts);
	for (const [script, command] of Object.entries(repositoryCheckScripts)) {
		add(
			issues,
			"package.json",
			rootScripts[script] === `bun ${command}`,
			`${script} must be "bun ${command}"`,
		);
	}
	for (const script of ["build", "run"] as const) {
		if (!rootScripts[script]) continue;
		add(
			issues,
			"package.json",
			rootScripts[script].includes(
				"bun tooling/manifest-policy.ts repository",
			),
			`${script} must gate on repository-mode manifest validation`,
		);
	}
	return issues;
}

function exportsSource(value: unknown): boolean {
	if (typeof value !== "object" || value === null) return false;
	return Object.entries(value).some(
		([key, target]) => key === "convex" || exportsSource(target),
	);
}

async function readCompilerOptions(path: string): Promise<JsonObject> {
	const config = Bun.JSONC.parse(await readFile(path, "utf8")) as {
		compilerOptions?: JsonObject;
	};
	return config.compilerOptions ?? {};
}

async function validateSourceCompilerOptions(
	workspace: Workspace,
	repositoryRoot: string,
): Promise<PolicyIssue[]> {
	const tsconfigPath = join(workspace.dir, "tsconfig.json");
	if (!exportsSource(workspace.manifest.exports) || !existsSync(tsconfigPath))
		return [];
	const base = await readCompilerOptions(
		join(repositoryRoot, "tooling/typescript/base.json"),
	);
	const own = await readCompilerOptions(tsconfigPath);
	const issues: PolicyIssue[] = [];
	for (const option of sharedCheckerOptions) {
		if (!(option in own)) continue;
		add(
			issues,
			`${workspace.relativePath}/tsconfig.json`,
			own[option] === effectiveOption(base, option),
			`compilerOptions.${option} must keep the base value, because consumers type-check this package's exported source`,
		);
	}
	return issues;
}

function allDependencyVersions(
	location: string,
	manifest: JsonObject,
): Array<{
	field: (typeof dependencyFields)[number];
	location: string;
	name: string;
	version: string;
}> {
	const versions: Array<{
		field: (typeof dependencyFields)[number];
		location: string;
		name: string;
		version: string;
	}> = [];
	for (const field of dependencyFields) {
		for (const [name, version] of Object.entries(
			stringRecord(manifest[field]),
		)) {
			versions.push({
				field,
				location: `${location}#${field}.${name}`,
				name,
				version,
			});
		}
	}
	return versions;
}

export async function validateManifestPolicy(options: {
	cwd: string;
	mode: PolicyMode;
}): Promise<PolicyIssue[]> {
	const repositoryRoot = await findRepositoryRoot(options.cwd);
	const rootManifest = await readJson(join(repositoryRoot, "package.json"));
	const expectedPackageManager = rootManifest.packageManager;
	if (typeof expectedPackageManager !== "string") {
		return [
			{
				location: "package.json",
				message: "root packageManager is required",
			},
		];
	}
	const bunVersion = /^bun@(\d+\.\d+\.\d+)$/.exec(
		expectedPackageManager,
	)?.[1];
	if (!bunVersion) {
		return [
			{
				location: "package.json",
				message: "root packageManager must pin an exact Bun version",
			},
		];
	}
	const rootDevDependencies = stringRecord(rootManifest.devDependencies);
	if (rootDevDependencies["bun-types"] !== bunVersion) {
		return [
			{
				location: "package.json",
				message: `root bun-types must be ${bunVersion}`,
			},
		];
	}
	const expectedNodeVersion = rootDevDependencies.node;
	const nodeMajor = /^(\d+)\.\d+\.\d+$/.exec(expectedNodeVersion ?? "")?.[1];
	if (!expectedNodeVersion || !nodeMajor) {
		return [
			{
				location: "package.json",
				message:
					"root devDependencies.node must pin an exact Node.js version",
			},
		];
	}
	const expectedNodeEngine = `${nodeMajor}.x`;
	if (stringRecord(rootManifest.engines).node !== expectedNodeEngine) {
		return [
			{
				location: "package.json",
				message: `root engines.node must be ${expectedNodeEngine}`,
			},
		];
	}
	if (options.mode === "package") {
		const relativePath = relative(repositoryRoot, options.cwd);
		const [kind, name, ...rest] = relativePath.split("/");
		if (
			(kind !== "app" && kind !== "battery") ||
			!name ||
			rest.length > 0
		) {
			return [
				{
					location: options.cwd,
					message:
						"package mode must run from an app/* or battery/* workspace",
				},
			];
		}
		const target: Workspace = {
			dir: options.cwd,
			kind,
			manifest: await readJson(join(options.cwd, "package.json")),
			relativePath,
		};
		return [
			...validateWorkspaceManifest(
				target,
				expectedPackageManager,
				expectedNodeEngine,
			),
			...(await validateSourceCompilerOptions(target, repositoryRoot)),
		];
	}

	const workspaces = await discoverWorkspaces(repositoryRoot);
	// Run inside a workspace, report only what touches it: its own manifest
	// and tsconfig, dependency edges into or out of it, and governed versions
	// it declares or sets the expectation for.
	const scope = workspaceScope(options.cwd, repositoryRoot, workspaces);
	const touchesScope = (...locations: string[]): boolean =>
		scope === undefined ||
		locations.some((location) =>
			location.startsWith(`${scope.relativePath}/`),
		);
	const issues: PolicyIssue[] = [];
	if (scope === undefined) {
		issues.push(...validateRootManifest(rootManifest));
	}

	for (const workspace of workspaces) {
		if (!touchesScope(`${workspace.relativePath}/`)) continue;
		issues.push(
			...validateWorkspaceManifest(
				workspace,
				expectedPackageManager,
				expectedNodeEngine,
			),
			...(await validateSourceCompilerOptions(workspace, repositoryRoot)),
		);
	}

	const workspaceByName = new Map(
		workspaces
			.filter((workspace) => typeof workspace.manifest.name === "string")
			.map((workspace) => [workspace.manifest.name as string, workspace]),
	);
	for (const workspace of workspaces) {
		for (const field of dependencyFields) {
			for (const [name, version] of Object.entries(
				stringRecord(workspace.manifest[field]),
			)) {
				const target = workspaceByName.get(name);
				if (
					!touchesScope(
						`${workspace.relativePath}/`,
						`${target?.relativePath}/`,
					)
				)
					continue;
				if (target) {
					add(
						issues,
						`${workspace.relativePath}/package.json`,
						version.startsWith("workspace:"),
						`${field}.${name} must use the workspace protocol`,
					);
				} else {
					add(
						issues,
						`${workspace.relativePath}/package.json`,
						!version.startsWith("workspace:"),
						`${field}.${name} uses workspace: but is not a workspace package`,
					);
				}
			}
		}
	}

	const governed = [
		...allDependencyVersions("package.json", rootManifest),
		...workspaces.flatMap((workspace) =>
			allDependencyVersions(
				`${workspace.relativePath}/package.json`,
				workspace.manifest,
			),
		),
	].filter(
		(entry) =>
			governedDependencies.includes(
				entry.name as (typeof governedDependencies)[number],
			) && entry.field !== "peerDependencies",
	);
	for (const dependency of governedDependencies) {
		const declarations = governed.filter(
			(entry) => entry.name === dependency,
		);
		const [first, ...rest] = declarations;
		if (!first) continue;
		for (const declaration of rest) {
			if (!touchesScope(declaration.location, first.location)) continue;
			add(
				issues,
				declaration.location,
				declaration.version === first.version,
				`${dependency} must use ${first.version}; found ${declaration.version}`,
			);
		}
	}
	return issues;
}
