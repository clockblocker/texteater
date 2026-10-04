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
	return {
		...config,
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
				"tooling/lib/knip-convex-condition.ts",
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
			],
		},
		...Object.fromEntries(
			workspacePaths.map((path) => [path, workspaceConfig(path)]),
		),
	},
};
