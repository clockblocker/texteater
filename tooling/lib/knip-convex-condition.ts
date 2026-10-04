/**
 * Preloaded into knip by `tooling/knip.ts`. Knip resolves package exports
 * with fixed conditions (`require`, `import`, `node`, `default`), which lead
 * a workspace import to its built `dist/`. TypeScript, Bun and Convex resolve
 * the `convex` condition first (`tooling/typescript/base.json`), which points
 * every in-house package at its source. This adds `convex` to knip's
 * conditions, so knip sees the same graph and counts an export that another
 * workspace imports as used, whether or not `dist/` exists.
 */
const resolverModule = /[\\/]knip[\\/]dist[\\/]util[\\/]resolve\.js$/;
const knipConditions = "conditionNames: ['require', 'import',";

Bun.plugin({
	name: "knip-convex-condition",
	setup(build) {
		build.onLoad({ filter: resolverModule }, async ({ path }) => {
			const source = await Bun.file(path).text();
			if (!source.includes(knipConditions)) {
				throw new Error(
					`${path} no longer sets ${knipConditions}…; update tooling/lib/knip-convex-condition.ts for this knip version.`,
				);
			}
			return {
				contents: source.replaceAll(
					knipConditions,
					"conditionNames: ['convex', 'require', 'import',",
				),
				loader: "js",
			};
		});
	},
});
