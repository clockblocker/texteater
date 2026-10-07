/**
 * The repository's one knip configuration. `tooling/knip.ts` runs knip over
 * the whole repository with it, so an export another workspace imports counts
 * as used. Each workspace keeps its entries in its own `knip.json`, which
 * becomes that workspace's block here.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const repositoryRoot = join(import.meta.dir, "..");
const dependencyFields = [
	"dependencies",
	"devDependencies",
	"optionalDependencies",
	"peerDependencies",
];
// Tools every package runs through the root install.
const sharedToolDependencies = [
	"@biomejs/biome",
	"bun-types",
	"dependency-cruiser",
	"knip",
];

function readJson(path: string): Record<string, unknown> {
	return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
}

// Workspaces run `bun test` through the shared runner, which knip's Bun
// plugin can't see through. These are the plugin's test-file patterns, scoped
// by any path the runner forwards, as the plugin scopes `bun test <path>`.
const packageTestRunner = "bun ../../tooling/run-package-tests.ts";
const bunTestPatterns = [
	"**/*.{test,spec}.{js,jsx,ts,tsx}",
	"**/*_{test,spec}.{js,jsx,ts,tsx}",
];

function runnerTestEntries(scripts: Record<string, unknown>): string[] {
	const entries = Object.values(scripts).flatMap((script) => {
		if (
			typeof script !== "string" ||
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

function workspaceConfig(relativePath: string): Record<string, unknown> {
	const dir = join(repositoryRoot, relativePath);
	const localConfigPath = join(dir, "knip.json");
	const {
		$schema: _schema,
		ignoreDependencies,
		...config
	} = existsSync(localConfigPath) ? readJson(localConfigPath) : {};
	const manifest = readJson(join(dir, "package.json"));
	const workspaceDependencies = dependencyFields.flatMap((field) =>
		Object.entries((manifest[field] ?? {}) as Record<string, unknown>)
			.filter(([, version]) => String(version).startsWith("workspace:"))
			.map(([name]) => name),
	);
	const testEntries = runnerTestEntries(
		(manifest.scripts ?? {}) as Record<string, unknown>,
	);
	return {
		...config,
		...(testEntries.length > 0 ? { bun: { entry: testEntries } } : {}),
		ignoreDependencies: [
			...new Set([
				...((ignoreDependencies as string[] | undefined) ?? []),
				...workspaceDependencies,
				...sharedToolDependencies,
			]),
		],
	};
}

const workspacePaths = ["app", "battery"].flatMap((kind) =>
	readdirSync(join(repositoryRoot, kind), { withFileTypes: true })
		.filter(
			(entry) =>
				entry.isDirectory() &&
				existsSync(
					join(repositoryRoot, kind, entry.name, "package.json"),
				),
		)
		.map((entry) => `${kind}/${entry.name}`),
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
				// Spawned by path.
				"tooling/dum-entrypoint-rss/empty-module.ts",
				"tooling/dum-entrypoint-rss/runner.ts",
			],
			project: ["tooling/**/*.ts"],
			ignoreDependencies: [
				// dependency-cruiser's Babel config (tooling/dependency-cruiser.babel.json).
				"@babel/core",
				"@babel/preset-react",
				"@babel/preset-typescript",
				// Run by path (tooling/lib/tools.ts).
				"dependency-cruiser",
				// The pinned Node binary CI and `demo` put on PATH.
				"node",
				// One hoisted copy for every workspace (#868).
				"effect",
				// The maintainer's TS7 editor plugin. No tracked tsconfig lists it;
				// the editor loads it from the root node_modules.
				"@clockblocker/ts7-plugin-sort-import-suggestions",
			],
		},
		...Object.fromEntries(
			workspacePaths.map((path) => [path, workspaceConfig(path)]),
		),
	},
};
