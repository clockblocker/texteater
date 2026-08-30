---
status: accepted
---

# Compile Zod-authored schemas into package-owned lightweight validators

Zod schemas are the authoring source for Dumling, Dumrel, Dumdict, and Dumgen,
but each package compiles committed lightweight validation artifacts for its
operational entrypoints. The shared codegen compiler fails on unsupported Zod
behavior rather than dropping semantics or falling back to Zod at runtime.

Callers use typed package parsers that return the canonical value or the shared
`ParsingError`. Generated representations remain package-private and are
differentially checked against their canonical schemas. This keeps operational
entrypoints small without creating a second schema API.
