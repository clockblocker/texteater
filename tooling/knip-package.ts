import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const packageDir = process.cwd();
const localConfigPath = join(packageDir, "knip.json");
const localConfig = existsSync(localConfigPath)
	? JSON.parse(readFileSync(localConfigPath, "utf8"))
	: {};
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
	...localConfig,
	ignoreDependencies: [
		...(localConfig.ignoreDependencies ?? []),
		...workspaceDependencies,
		"@biomejs/biome",
		"@typescript/native",
		"bun-types",
		"dependency-cruiser",
		"knip",
	],
};
