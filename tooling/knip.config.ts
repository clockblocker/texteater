/**
 * The repository's one knip configuration. `tooling/knip.ts` runs knip over
 * the whole repository with it, so an export another workspace imports counts
 * as used. Each workspace keeps its entries in its own `knip.json`, which
 * becomes that workspace's block here.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { dependencyFields, packageTestRunner } from "./lib/manifest-policy";
import {
	discoverWorkspaces,
	readJson,
	stringRecord,
	type Workspace,
} from "./lib/workspaces";

const repositoryRoot = join(import.meta.dir, "..");
// Tools every package runs through the root install.
const sharedToolDependencies = [
	"@biomejs/biome",
	"bun-types",
	"dependency-cruiser",
	"knip",
];
// tsconfig plugin names, which knip reads as packages. The root
// `@effect/tsgo` install serves `@effect/language-service`.
const tsconfigPluginNames = ["@effect/language-service"];

// Workspaces run `bun test` through the shared runner, which knip's Bun
// plugin can't see through. These are the plugin's test-file patterns, scoped
// by any path the runner forwards, as the plugin scopes `bun test <path>`.
const bunTestPatterns = [
	"**/*.{test,spec}.{js,jsx,ts,tsx}",
	"**/*_{test,spec}.{js,jsx,ts,tsx}",
];

function runnerTestEntries(scripts: Record<string, string>): string[] {
	const entries = Object.values(scripts).flatMap((script) => {
		if (
			!(
				script === packageTestRunner ||
				script.startsWith(`${packageTestRunner} `)
			)
		)
			return [];
		const targets = script
			.slice(packageTestRunner.length)
			.split(/\s+/)
			.filter((arg) => arg !== "" && !arg.startsWith("-"));
		if (targets.length === 0) return bunTestPatterns;
		return targets.flatMap((target) =>
			/[*{?]/.test(target) || /\.\w+$/.test(target)
				? [target]
				: bunTestPatterns.map(
						(pattern) => `${target.replace(/\/+$/, "")}/${pattern}`,
					),
		);
	});
	return [...new Set(entries)];
}

async function workspaceConfig(
	workspace: Workspace,
): Promise<Record<string, unknown>> {
	const localConfigPath = join(workspace.dir, "knip.json");
	const {
		$schema: _schema,
		ignoreDependencies,
		...config
	} = existsSync(localConfigPath) ? await readJson(localConfigPath) : {};
	const workspaceDependencies = dependencyFields.flatMap((field) =>
		Object.entries(stringRecord(workspace.manifest[field]))
			.filter(([, version]) => version.startsWith("workspace:"))
			.map(([name]) => name),
	);
	const testEntries = runnerTestEntries(
		stringRecord(workspace.manifest.scripts),
	);
	return {
		...config,
		...(testEntries.length > 0 ? { bun: { entry: testEntries } } : {}),
		ignoreDependencies: [
			...new Set([
				...((ignoreDependencies as string[] | undefined) ?? []),
				...workspaceDependencies,
				...sharedToolDependencies,
				...tsconfigPluginNames,
			]),
		],
	};
}

const workspaces = await discoverWorkspaces(repositoryRoot);
const workspaceConfigs = await Promise.all(
	workspaces.map(
		async (workspace) =>
			[workspace.relativePath, await workspaceConfig(workspace)] as const,
	),
);

export default {
	// Dead public surface hides in entry files' exports; the whole-repository
	// run tells a cross-workspace import from dead code.
	includeEntryExports: true,
	// Package build scripts delegate to the repository's root Turbo install.
	ignoreBinaries: ["turbo"],
	workspaces: {
		".": {
			entry: [
				"tooling/*.ts",
				"tooling/**/*.test.ts",
				// Loaded by `.oxlintrc.json` via `jsPlugins`.
				"tooling/oxlint-plugin/index.ts",
				// Spawned by path.
				"tooling/dum-entrypoint-rss/empty-module.ts",
				"tooling/dum-entrypoint-rss/runner.ts",
				// `bun img/icon/workbench/render.ts <variant>`, which imports each variant by path.
				"img/icon/workbench/render.ts",
			],
			// The icon workbench's renderer only: its variants load by path, and its
			// drawing kit waits for the next variant to use it.
			project: ["tooling/**/*.ts", "img/icon/workbench/render.ts"],
			ignoreDependencies: [
				// dependency-cruiser's Babel config (tooling/dependency-cruiser.babel.json).
				"@babel/core",
				"@babel/preset-react",
				"@babel/preset-typescript",
				// Run by path (tooling/lib/tools.ts).
				"dependency-cruiser",
				"oxlint",
				// Oxlint's type-aware backend, which `typeAware` in .oxlintrc.json loads.
				"oxlint-tsgolint",
				// The pinned Node binary CI and `demo` put on PATH.
				"node",
				// One hoisted copy for every workspace (#868).
				"effect",
				// The maintainer's TS7 editor plugin. No tracked tsconfig lists it;
				// the editor loads it from the root node_modules.
				"@clockblocker/ts7-plugin-sort-import-suggestions",
				...tsconfigPluginNames,
			],
		},
		...Object.fromEntries(workspaceConfigs),
	},
};
