import { join } from "node:path";

export interface ToolPaths {
	biome: string;
	dependencyCruiser: string;
	knip: string;
	typescript: string;
}

export function toolPaths(repositoryRoot: string): ToolPaths {
	const modules = join(repositoryRoot, "node_modules");
	return {
		biome: join(modules, "@biomejs", "biome", "bin", "biome"),
		dependencyCruiser: join(
			modules,
			"dependency-cruiser",
			"bin",
			"dependency-cruise.mjs",
		),
		knip: join(modules, "knip", "bin", "knip.js"),
		typescript: join(modules, "typescript", "bin", "tsc"),
	};
}
