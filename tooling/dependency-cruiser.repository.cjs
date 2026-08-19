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
			name: "tf-demo-server-does-not-import-convex",
			comment:
				"Application logic must not depend on the Convex adapter layer.",
			severity: "error",
			from: { path: "^app/tf-demo/server/" },
			to: { path: "^app/tf-demo/convex/" },
		},
		{
			name: "tf-demo-convex-does-not-import-ui",
			comment:
				"Convex modules must not depend on browser implementation code.",
			severity: "error",
			from: { path: "^app/tf-demo/convex/" },
			to: { path: "^app/tf-demo/src/" },
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
