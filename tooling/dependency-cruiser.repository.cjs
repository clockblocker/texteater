module.exports = {
	forbidden: [
		{
			name: "no-cross-workspace-cycles",
			comment: "Workspace folders must form an acyclic graph.",
			severity: "error",
			scope: "folder",
			from: { path: "^(app|battery)/[^/]+$" },
			to: { circular: true },
		},
		{
			name: "batteries-do-not-import-apps",
			comment: "Reusable batteries cannot depend on applications.",
			severity: "error",
			from: { path: "^battery/" },
			to: { path: "^app/" },
		},
		{
			name: "no-unresolved",
			comment: "Every repository import must resolve.",
			severity: "error",
			from: { path: "^(app|battery)/" },
			to: { couldNotResolve: true },
		},
	],
	options: {
		doNotFollow: { path: "node_modules" },
		exclude: "(^|/)(dist|node_modules|\\.astro)(/|$)",
		includeOnly: "^(app|battery)/",
		webpackConfig: {
			fileName: "tooling/dependency-cruiser.webpack.cjs",
		},
		tsPreCompilationDeps: true,
	},
};
