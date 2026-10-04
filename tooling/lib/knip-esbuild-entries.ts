/**
 * Imported by `tooling/lib/knip-run.ts` before knip loads. Knip reads the
 * first file on an `esbuild` command line in a package script as an entry
 * whose exports it never analyzes, as it would a script that `bun` runs. In
 * this repository that file is the package root that each package's
 * `build:js` bundles, so knip skipped the root's exports entirely, both its
 * declarations and its re-exports. Every file a package bundles is already an
 * entry in its `knip.json`, so this stops knip from taking entries from
 * `esbuild` command lines, and a package root's exports get checked.
 */
const fallbackModule = /[\\/]knip[\\/]dist[\\/]binaries[\\/]fallback\.js$/;
const positionals = "new Set(['babel-node', 'esbuild', ";

Bun.plugin({
	name: "knip-esbuild-entries",
	setup(build) {
		build.onLoad({ filter: fallbackModule }, async ({ path }) => {
			const source = await Bun.file(path).text();
			if (!source.includes(positionals)) {
				throw new Error(
					`${path} no longer sets ${positionals}…; update tooling/lib/knip-esbuild-entries.ts for this knip version.`,
				);
			}
			return {
				contents: source.replace(
					positionals,
					"new Set(['babel-node', ",
				),
				loader: "js",
			};
		});
	},
});
