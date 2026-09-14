---
status: accepted
---

# Compile Zod-authored schemas into package-owned lightweight validators

Zod schemas are the authoring source for Dumling, Dumrel, Dumdict, and Dumgen,
but each package compiles committed lightweight validation artifacts for its
operational entrypoints. The shared `dumval/compiler` compiler fails on unsupported Zod
behavior rather than dropping semantics or falling back to Zod at runtime.

Callers use typed package parsers that return the canonical value or the shared
`ParsingError`. Generated rules stay with their domain owner. Dumling and Dumrel expose readonly
provider handles through `compiled-validation` subpaths. Dumrel links to Dumling;
Dumdict and Dumgen link to both. The compiler emits each equivalent rule
definition once across those dependencies, preserving field order, union order,
normalization, recursive rules and exact diagnostics. Original compiler graphs
remain generation and differential-test inputs; operational imports use only
the linked tables.

`dumval/runtime` owns interpretation, `ParsingError`, and provider binding.
Handles expose root names and a fingerprint. The runtime keeps rule tables in a
private WeakMap and shares dependency definitions without copying them. This
prevents consumer mutation without recursively freezing thousands of rule
objects, which erased the memory saving in the first production build. Its
imports and declarations remain independent of Zod and compilation. Existing
`common-utils` validation exports forward to this runtime for compatibility;
existing `codegen` compilation exports forward to `dumval/compiler`.

Each generated provider has a fingerprint covering its rules, operation
signatures and dependency fingerprint. Consumers bind only to the exact provider
used at generation time. A mismatch fails during module loading and requires
regenerating and rebuilding downstream packages. We accept this explicit version
coupling because their validation behavior already depends on those providers.
Public parser contracts and composable Zod schema entrypoints remain unchanged.
Generated providers are differentially checked against the canonical schemas.

## Considered Options

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
