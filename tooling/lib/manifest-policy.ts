import { join, relative } from "node:path";
import {
	discoverWorkspaces,
	findRepositoryRoot,
	type JsonObject,
	readJson,
	stringRecord,
	type Workspace,
} from "./workspaces";

export type PolicyMode = "package" | "repository";

export interface PolicyIssue {
	location: string;
	message: string;
}

export const governedDependencies = [
	"zod",
	"typescript",
	"@typescript/native",
	"@types/node",
	"bun-types",
	"@biomejs/biome",
	"dependency-cruiser",
	"knip",
] as const;

const requiredWorkspaceScripts = ["build", "test", "validate"] as const;
const dependencyFields = [
	"dependencies",
	"devDependencies",
	"optionalDependencies",
	"peerDependencies",
] as const;

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
	for (const script of ["build", "run"] as const) {
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
		return validateWorkspaceManifest(target, expectedPackageManager);
	}

	const workspaces = await discoverWorkspaces(repositoryRoot);
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

	for (const workspace of workspaces) {
		issues.push(
			...validateWorkspaceManifest(workspace, expectedPackageManager),
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
		const expected = declarations[0]?.version;
		if (!expected) continue;
		for (const declaration of declarations.slice(1)) {
			add(
				issues,
				declaration.location,
				declaration.version === expected,
				`${dependency} must use ${expected}; found ${declaration.version}`,
			);
		}
	}
	return issues;
}
