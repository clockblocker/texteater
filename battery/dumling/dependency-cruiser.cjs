const packageConfig = require("../../tooling/dependency-cruiser.package.cjs");

module.exports = {
	...packageConfig,
	forbidden: [
		...packageConfig.forbidden,
		{
			name: "concrete-kinds-use-language-feature-catalogs",
			comment:
				"Concrete Family and Kind modules must use their language feature catalog instead of the universal feature catalog.",
			severity: "error",
			from: {
				path: "^src/schemas/concrete-language/[^/]+/[^/]+/",
			},
			to: { path: "^src/schemas/universal/features/catalog\\.ts$" },
		},
		{
			name: "universal-schemas-hide-their-internals",
			comment:
				"Only the universal schema module and language feature catalogs may access universal schema internals.",
			severity: "error",
			from: {
				pathNot:
					"^(?:src/schemas/universal/|src/schemas/concrete-language/[^/]+/[^/]+-feature-catalog\\.ts$)",
			},
			to: { path: "^src/schemas/universal/(?!index\\.ts$)" },
		},
		{
			name: "validation-does-not-import-schemas",
			comment:
				"Runtime validation modules must never reach Zod or src/schemas/ (ADR 0001).",
			severity: "error",
			from: { path: "^src/validation/" },
			to: { path: "^src/schemas/" },
		},
		{
			name: "universal-semantics-do-not-import-languages",
			comment:
				"Universal semantic validation modules must stay decoupled from concrete language modules.",
			severity: "error",
			from: { path: "^src/validation/(?:semantics|syncretism)\\.ts$" },
			to: { path: "^src/validation/languages/" },
		},
		{
			name: "language-validation-is-self-contained",
			comment:
				"A language's validation folder must not import another language's validation folder.",
			severity: "error",
			from: { path: "^src/validation/languages/([^/]+)/" },
			to: {
				path: "^src/validation/languages/([^/]+)/",
				pathNot: "^src/validation/languages/$1/",
			},
		},
	],
};
