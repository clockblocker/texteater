# Dumling Docs

Dumling Docs publishes Markdown and HTML from executable sources.

Edit `src/to-generate/docs/**/*.doc.ts` for prose pages. Examples are Spec
Records of the `dumspec` battery: a page cites one with
`specExample("<record id>", <target index>)`, and every record target gets an
attestation page. Do not edit `src/generated/`, `public/`, or `dist/`; those
are derived caches or builds.

`scripts/generate-content/docs/spec/` generates the spec pages from `dumspec`
and the built `dumling/schema/*` modules (ADR 0037):

- one page per language × Family × Kind route, with its Rules, its Core and
  Inflectional features and every record target that attests it;
- one page per feature a language's routes allow, and per Surface and
  Attestation field, with sample targets for each value;
- a universal `/u/` page per Kind that links the language pages;
- a Rules page per language.

A `.doc.ts` at the same route becomes the page's introduction. The generator
fails when a Kind or language feature page has no schema route, or a route
has no page.

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
