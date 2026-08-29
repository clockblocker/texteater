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
			name: "tf-demo-dumdict-storage-implementation-is-private",
			comment:
				"Callers must use the Dumdict storage interface file; its implementation folder is private.",
			severity: "error",
			from: {
				pathNot: "^app/tf-demo/convex/dumdictStorage(?:\\.ts|/)",
			},
			to: { path: "^app/tf-demo/convex/dumdictStorage/" },
		},
		{
			name: "tf-demo-german-reading-renderer-overrides-are-private",
			comment:
				"Private German Reading renderer leaves may only be imported by the auditable German override index.",
			severity: "error",
			from: {
				pathNot:
					"^app/tf-demo/src/notes/reading/de/de-renderer-overrides\\.tsx$",
			},
			to: {
				path: "^app/tf-demo/src/notes/reading/de/renderer-overrides/",
			},
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
