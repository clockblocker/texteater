# codegen

`codegen` runs deterministic, typed code-generation recipes.

```ts
import { namedBlockMarkdown, runCodegen } from "codegen";

const readme = namedBlockMarkdown({
	template: "./README.template.md",
	snippets: {
		root: "./examples",
		include: ["*.ts"],
	},
	marker: "README_BLOCK",
	fence: "ts",
	preamble: "<!-- Generated. -->\n\n",
	output: {
		root: ".",
		path: "README.md",
	},
	unusedBlocks: "error",
});

await runCodegen(readme, { mode: "write" });
```

Use `mode: "check"` to plan and report drift without changing the filesystem.
Recipes may opt into an ownership manifest; only files listed in the previous
manifest can become stale and be removed.

For general generators, `defineCodegen` separates discovery, primary
artifacts, and derived artifacts:

```ts
import { defineCodegen, runCodegen } from "codegen";

const recipe = defineCodegen({
	inputs: {
		pages: {
			kind: "text-set",
			root: "./pages",
			include: ["**/*.md"],
			recursive: true,
		},
	},
	outputs: {
		public: {
			root: "./public",
			ownership: {
				manifest: ".codegen/public.json",
			},
		},
	},
	build: ({ pages }) =>
		pages.map((page, index) => ({
			id: page.source.path,
			to: { target: "public", path: `page-${index}.md` },
			content: page.text,
			provenance: [page.source],
			meta: { title: page.source.path },
		})),
	aggregate: (primary) => [
		{
			id: "index",
			to: { target: "public", path: "index.json" },
			content: `${JSON.stringify(
				primary.map(({ digest, id }) => ({ digest, id })),
				null,
				2,
			)}\n`,
			provenance: primary.map(({ id }) => ({
				kind: "artifact",
				id,
			})),
			meta: { title: "Index" },
		},
	],
});

const result = await runCodegen(recipe, { mode: "check" });
if (result.status === "changed") {
	process.exitCode = 1;
}
```

An output may provide `ownership.initialFiles` to adopt a precisely
enumerated pre-manifest output set during a generator migration. The runner
validates all artifact, manifest, and stale-file paths before mutation,
rejects filesystem-equivalent collisions, and refuses symlink traversal
below an output root.
