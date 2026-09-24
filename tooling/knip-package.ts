import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const packageDir = process.cwd();
const localConfigPath = join(packageDir, "knip.json");
const localConfig = existsSync(localConfigPath)
	? JSON.parse(readFileSync(localConfigPath, "utf8"))
	: {};
const {
	ignoreBinaries: localIgnoreBinaries,
	ignoreDependencies: localIgnoreDependencies,
	...knipConfig
} = localConfig;
const manifest = JSON.parse(
	readFileSync(join(packageDir, "package.json"), "utf8"),
);
const dependencyFields = [
	"dependencies",
	"devDependencies",
	"optionalDependencies",
	"peerDependencies",
];
const workspaceDependencies = dependencyFields.flatMap((field) =>
	Object.entries(manifest[field] ?? {})
		.filter(([, version]) => String(version).startsWith("workspace:"))
		.map(([name]) => name),
);

export default {
	...knipConfig,
	// Package build scripts delegate to the repository's root Turbo install.
	ignoreBinaries: [...(localIgnoreBinaries ?? []), "turbo"],
	ignoreDependencies: localIgnoreDependencies ?? [
		...workspaceDependencies,
		"@biomejs/biome",
		"bun-types",
		"dependency-cruiser",
		"knip",
	],
};
