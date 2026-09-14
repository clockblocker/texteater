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

## Rejected alternative: eager runtime Zod schemas

On 2026-09-14 we tested replacing Dumgen's compiled validation registry with
`canonicalDumgenValidationSchemas` and calling each schema's `safeParse` at
runtime. The goal was to reuse Dumling and Dumrel schemas without duplicating
compiled rules. We rejected this implementation because it increased memory
well beyond the proposed 20 MiB incremental import budget.

The benchmark preloaded Effect, Dumling, Dumrel, and Dumdict/runtime before
importing Dumgen. These are medians from seven fresh Bun 1.4.2 processes on
macOS arm64, using staged package builds and deterministic model responses.

| Measurement | Compiled validation | Runtime Zod with shared schema imports |
| --- | ---: | ---: |
| Extra peak RSS at Dumgen import | 10.34 MiB | 81.31 MiB |
| Dumgen import time | 29.18 ms | 136.53 ms |
| Peak RSS above the Effect preload after sample workflows | 50.36 MiB | 118.64 MiB |

The workflows covered segmentation, noun grammar, Reading emoji generation,
an empty Knowledge request, 20 warm calls of each, and a malformed unit.
The import and workload rows use different baselines and must not be added.

Using the existing schema bundles unchanged was worse: Dumgen added
262.94 MiB at import. Dumrel's schema bundle embedded Dumling schema copies.
Rebuilding that entrypoint with external Dumling schema imports reduced the
cost to the 81.31 MiB above. Sharing corrected this packaging problem but
did not make the eager schema graph affordable. Separate import probes found
that Zod alone added 4.16 MiB and one Dumling German noun schema, including
Zod, added 9.80 MiB. Those probes are independent, not additive.

This result applies to eagerly constructing the current full schema graph.
It does not establish a minimum cost for Zod or measure lazy loading of
individual schemas. Dumling and Dumrel retained their compiled operational
APIs in this experiment, so both representations were present. Catalog,
prompts, and model-output JSON Schemas were unchanged. These are local
measurements, not deployed tf-demo or Convex memory. Representative workflow
assertions passed; the full DX gate was not run for this alternative.

The temporary runtime-Zod patch and runner mode were removed after recording
the result. Retained evidence includes raw samples, source and build hashes,
and measurement details in [the full-graph benchmark](../../battery/experiments/dum-validation/results/runtime-zod-loading.json)
and [the isolated import probes](../../battery/experiments/dum-validation/results/runtime-zod-imports.json).
