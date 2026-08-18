module.exports = {
	forbidden: [
		{
			name: "no-circular",
			comment: "Package modules must not form circular dependencies.",
			severity: "error",
			from: { pathNot: "(^|/)convex/_generated/" },
			to: {
				circular: true,
				pathNot: "(^|/)convex/_generated/",
			},
		},
		{
			name: "no-unresolved",
			comment: "Every import must resolve.",
			severity: "error",
			from: {},
			to: { couldNotResolve: true, pathNot: "^astro:" },
		},
		{
			name: "production-does-not-import-tests",
			comment: "Runtime source cannot depend on test code.",
			severity: "error",
			from: { path: "^src/" },
			to: { path: "(^|/)(tests?|__tests__)/" },
		},
		{
			name: "runtime-dependencies-are-declared",
			comment: "Runtime source can only use declared packages.",
			severity: "error",
			from: { path: "^src/" },
			to: { dependencyTypes: ["npm-no-pkg", "npm-unknown"] },
		},
		{
			name: "runtime-does-not-use-dev-dependencies",
			comment: "Runtime source dependencies belong in dependencies.",
			severity: "error",
			from: { path: "^src/" },
			to: { dependencyTypes: ["npm-dev"] },
		},
	],
	options: {
		doNotFollow: { path: "node_modules" },
		exclude: "(^|/)(dist|node_modules|\\.astro)(/|$)",
		enhancedResolveOptions: {
			conditionNames: ["types", "import", "node", "bun", "default"],
			exportsFields: ["exports"],
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
			mainFields: ["types", "module", "main"],
		},
		tsPreCompilationDeps: true,
	},
};
