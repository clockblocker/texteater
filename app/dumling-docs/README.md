# Dumling Docs

Dumling Docs publishes Markdown and HTML from executable sources.

Edit `src/to-generate/docs/**/*.doc.ts` for prose pages and
`src/to-generate/attestations/**/*.ts` for curated examples. The CSV files in
`src/classification-logbook/` are generated review data. Do not edit
`src/generated/`, `public/`, or `dist/`; those are derived caches or builds.

```sh
bun run generate:attestations
bun run generate:docs
bun run generate:docs:check
bun run check
bun test
bun run build
```

Generated source pages include `generatedFrom` provenance. Publication copies
omit that internal path.
