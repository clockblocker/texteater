# Dumling Docs

Dumling Docs publishes Markdown and HTML from executable sources.

Edit `src/to-generate/docs/**/*.doc.ts` for prose pages. Examples are Spec
Records of the `dumspec` battery: a page cites one with
`specExample("<record id>", <target index>)`, and every record target gets an
attestation page. Do not edit `src/generated/`, `public/`, or `dist/`; those
are derived caches or builds.

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
