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
				path: "^src/schemas/concrete-language/[^/]+/(?:construction|lexeme|morpheme|phraseme)/",
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
	],
};
