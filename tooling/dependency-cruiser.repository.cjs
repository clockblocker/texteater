const { existsSync, readFileSync, readdirSync } = require("node:fs");
const { join, resolve } = require("node:path");

const repositoryRoot = resolve(__dirname, "..");

/**
 * The workspaces' layer order, lowest first. A package may import only
 * packages in lower layers: never one in its own layer or above. Promptsmith
 * sits beside Dumling because only Dumgen consumes it, and
 * react-resizable-panels sits below Lego because Lego imports it. Every
 * workspace must appear here.
 */
const layers = [
	["common-utils", "codegen", "react-resizable-panels"],
	["dumling", "promptsmith", "lego"],
	["dumrel"],
	["dumcorpus"],
	["dumdict", "dumgen"],
	["@dumling/docs-site", "@texteater/spec-review", "@texteater/tf-demo"],
];

const directories = new Map();
for (const kind of ["app", "battery"]) {
	const parent = join(repositoryRoot, kind);
	if (!existsSync(parent)) continue;
	for (const entry of readdirSync(parent, { withFileTypes: true })) {
		const manifestPath = join(parent, entry.name, "package.json");
		if (!entry.isDirectory() || !existsSync(manifestPath)) continue;
		const { name } = JSON.parse(readFileSync(manifestPath, "utf8"));
		directories.set(name, `${kind}/${entry.name}`);
	}
}
const layered = layers.flatMap((names, layer) =>
	names.map((name) => ({ name, layer })),
);
for (const name of directories.keys())
	if (!layered.some((entry) => entry.name === name))
		throw Error(
			`tooling/dependency-cruiser.repository.cjs: workspace ${name} has no layer`,
		);
for (const { name } of layered)
	if (!directories.has(name))
		throw Error(
			`tooling/dependency-cruiser.repository.cjs: layer entry ${name} is no workspace`,
		);

const pathOf = (name) =>
	`^${directories.get(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/`;

module.exports = {
	forbidden: layered.flatMap((importer) =>
		layered
			.filter(
				(imported) =>
					imported.name !== importer.name &&
					imported.layer >= importer.layer,
			)
			.map((imported) => ({
				name: `layer-order: ${importer.name} (layer ${importer.layer}) may not import ${imported.name} (layer ${imported.layer})`,
				comment:
					"A package imports only packages in lower layers (tooling/dependency-cruiser.repository.cjs).",
				severity: "error",
				from: { path: pathOf(importer.name) },
				to: { path: pathOf(imported.name) },
			})),
	),
	options: {
		parser: "acorn",
		babelConfig: { fileName: "tooling/dependency-cruiser.babel.json" },
		doNotFollow: { path: "node_modules" },
		exclude: "(^|/)(dist|node_modules|\\.astro)(/|$)",
		includeOnly: "^(app|battery)/",
		webpackConfig: {
			fileName: "tooling/dependency-cruiser.webpack.cjs",
		},
		tsPreCompilationDeps: false,
	},
};
