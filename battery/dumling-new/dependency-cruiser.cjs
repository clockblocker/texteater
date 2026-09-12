const packageConfig = require("../../tooling/dependency-cruiser.package.cjs");

module.exports = {
	...packageConfig,
	forbidden: [
		...packageConfig.forbidden,
		{
			name: "universal-schemas-hide-their-internals",
			comment:
				"Modules outside the universal schema module must use its root interface.",
			severity: "error",
			from: { pathNot: "^src/schemas/universal/" },
			to: { path: "^src/schemas/universal/(?!index\\.ts$)" },
		},
	],
};
