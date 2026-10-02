module.exports = {
	forbidden: [
		{
			name: "no-unresolved",
			comment: "Every repository import must resolve.",
			severity: "error",
			from: { path: "^(app|battery)/" },
			to: { couldNotResolve: true },
		},
	],
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
