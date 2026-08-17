const { existsSync, readFileSync, readdirSync } = require("node:fs");
const { join, resolve } = require("node:path");

const repositoryRoot = resolve(__dirname, "..");

function exportedTarget(value) {
	if (typeof value === "string") return value;
	if (!value || typeof value !== "object") return undefined;
	for (const condition of ["types", "import", "default"]) {
		const target = exportedTarget(value[condition]);
		if (target) return target;
	}
	return undefined;
}

function sourceTarget(workspaceDir, target, fallback) {
	if (typeof target === "string") {
		const sourceRelative = target
			.replace(/^\.\/dist\//, "./src/")
			.replace(/\.d\.[cm]?ts$/, ".ts")
			.replace(/\.[cm]?js$/, ".ts");
		const candidate = resolve(workspaceDir, sourceRelative);
		if (existsSync(candidate)) return candidate;
	}
	return resolve(workspaceDir, fallback);
}

const aliases = [];
for (const kind of ["app", "battery"]) {
	const parent = join(repositoryRoot, kind);
	if (!existsSync(parent)) continue;
	for (const entry of readdirSync(parent, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue;
		const workspaceDir = join(parent, entry.name);
		const manifestPath = join(workspaceDir, "package.json");
		if (!existsSync(manifestPath)) continue;
		const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
		if (typeof manifest.name !== "string") continue;
		const exports =
			manifest.exports &&
			typeof manifest.exports === "object" &&
			!Array.isArray(manifest.exports)
				? manifest.exports
				: { ".": manifest.exports };
		for (const [key, value] of Object.entries(exports)) {
			if (key !== "." && !key.startsWith("./")) continue;
			if (key.includes("*")) continue;
			const request =
				key === "."
					? manifest.name
					: `${manifest.name}/${key.slice(2)}`;
			const fallback =
				key === "." ? "src/index.ts" : `src/${key.slice(2)}.ts`;
			const target = sourceTarget(
				workspaceDir,
				exportedTarget(value),
				fallback,
			);
			if (existsSync(target)) {
				aliases.push({
					alias: target,
					name: request,
					onlyModule: true,
				});
			}
		}
	}
}

module.exports = {
	resolve: {
		alias: aliases,
		conditionNames: ["types", "import", "node", "bun", "default"],
		extensions: [
			".d.ts",
			".ts",
			".tsx",
			".js",
			".jsx",
			".mjs",
			".cjs",
			".json",
		],
		exportsFields: ["exports"],
		mainFields: ["types", "module", "main"],
	},
};
