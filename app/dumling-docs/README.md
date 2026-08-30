# Dumling Docs

Dumling Docs publishes generated Markdown and HTML from executable authoring
sources. Edit source files, never generated caches.

## Source authority

- `src/to-generate/docs/**/*.doc.ts`: typed documentation pages.
- `src/to-generate/attestations/**/*.ts`: curated entity and Attestation
  examples.
- `src/classification-logbook/**/*.md`: authored classification summaries,
  rules, reviewer notes, and open questions. Generated CSV files in the same
  branch are caches of Attestation sources.
- `scripts/generate-content/**`: generation, ownership, routing, and rendering
  rules.

`src/generated/**` and `public/**` are derived caches. `dist/**` is the
publication build. A generated page's `generatedFrom` frontmatter points back
to its typed or curated source; publication copies intentionally omit that
provenance.

## Generate and verify

```sh
bun run generate:attestations
bun run generate:docs
bun run generate:docs:check
bun run build
bun run check
bun test
```

The [Doc-Cite route overhaul](./plans/doc-cite-ud-route-overhaul.md) is a
completed implementation plan retained as history. Its `docs-site/**` paths
describe the pre-move layout and are not current authoring paths.
