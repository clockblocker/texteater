# Dum operational-entrypoint RSS baseline

Captured 2026-10-04T07:48:54.867Z from `3e6fcd7737638fa437b552aa574fe95d2af8beb3` with Bun 1.4.2 on darwin/arm64.

Contract: the whole Dum chain must add at most 30 MiB peak RSS after Effect is loaded, using seven fresh processes and the median of within-process deltas. Isolated entrypoint measurements below are diagnostic. Raw samples are retained in the adjacent JSON artifact.

```text
PASS shared Dum import RSS: +20.703 MiB after Effect; ceiling 30.000 MiB
  dumling: +3.359 MiB at this step; +3.359 MiB since Effect
  dumrel: +2.000 MiB at this step; +6.281 MiB since Effect
  dumdict/planning: +14.984 MiB at this step; +20.703 MiB since Effect
  Seven-process median of paired peak deltas. Local import replay; not deployed tf-demo or operation memory.
```

Each probe runs against staged package manifests and built JavaScript, outside development TypeScript path aliases. Bun reports maxRSS in KiB; raw samples convert that value to bytes before calculating deltas.

Empty-module samples: `18628608`, `18694144`, `18694144`, `18546688`, `18513920` bytes; median `18628608` bytes.

## Canonical matrix

| Entrypoint | Classification | Representative operation | Import delta (MiB) | Import + operation delta (MiB) | Reachable schema/heavy dependencies |
| --- | --- | --- | ---: | ---: | --- |
| `dumling` | operational | parse unit | 5.484 | 6.172 | none |
| `dumling/types` | type-only | Structural declarations, with empty JavaScript. | — | — | — |
| `dumling/validation` | operational | validate feature bag | 2.188 | 2.438 | none |
| `dumling/package.json` | metadata | Package metadata. | — | — | — |
| `dumling/schema/*` | schema-authoring-exempt | Explicit schema or experiment authoring surface. | — | — | — |
| `dumrel` | operational | knowledge projection | 7.563 | 15.484 | none |
| `dumrel/types` | type-only | Structural declarations, with empty JavaScript. | — | — | — |
| `dumrel/schema` | schema-authoring-exempt | Explicit schema or experiment authoring surface. | — | — | — |
| `dumrel/package.json` | metadata | Package metadata. | — | — | — |
| `dumdict` | operational | parse record | 25.063 | 25.172 | none |
| `dumdict/schema` | schema-authoring-exempt | Explicit schema or experiment authoring surface. | — | — | — |
| `dumdict/pending` | operational | pending identity | 5.766 | 5.641 | none |
| `dumdict/planning` | operational | plan reading entry | 24.188 | 28.344 | none |
| `dumdict/package.json` | metadata | Package metadata. | — | — | — |
| `dumdict/testing` | development-support | Storage conformance suite for adapter tests; imports bun:test and is never loaded at application runtime. | — | — | — |
| `dumling/validation-artifact` | development-support | Unlinked compiled validation that sibling generators link against; never loaded at application runtime. | — | — | — |
| `dumling/compiled-validation` | operational | Validate through the shared rule protocol | 3.250 | 5.828 | none |
| `dumrel/validation-artifact` | development-support | Unlinked compiled validation that sibling generators link against; never loaded at application runtime. | — | — | — |
| `dumrel/compiled-validation` | operational | Validate through the shared rule protocol | 4.891 | 9.031 | none |
| `dumval/runtime` | operational | Validate through the shared rule protocol | 1.422 | 1.984 | none |
| `dumval/compiler` | schema-authoring-exempt | Build-time Zod compilation and rule linking. | — | — | — |
| `dumval/package.json` | metadata | Package metadata. | — | — | — |

## Interpretation

The shared import budget replaces the previous per-entrypoint 5/5.3 MiB limits. It measures Dumling → Dumrel → Dumdict planning after effect/Effect. Shared dependencies are counted once. This is a local package-import replay, not deployed tf-demo RSS, and excludes provider SDK, app initialization, and operations. Heavyweight and schema reachability remain a zero-tolerance rule for every operational surface.

The explicit schema/model-authoring escape hatches are `dumling/schema/*`, `dumrel/schema`, `dumdict/schema`, `dumval/compiler`. They are exempt from the operational budget; any schema reachability from an operational package root remains a violation rather than gaining an exemption.

A vocabulary or settings subpath is operational runtime data, so it is measured. Type-only JavaScript and `package.json` metadata are inventoried for exhaustiveness but not benchmarked.

Reachability is derived from the built public JavaScript graph. `zod` identifies schema/runtime weight; `openai` identifies the provider SDK loaded by a convenience entrypoint. An explicit `/schema` dependency reachable from an operational entrypoint is always reported even when Zod is also visible directly.

## Reproduce

```sh
bun run benchmark:dum-shared
bun run benchmark:dum-entrypoints
bun run benchmark:dum-entrypoints --write
```

`benchmark:dum-shared` rebuilds the packages and checks only the shared import budget. `benchmark:dum-entrypoints` also reports isolated diagnostics; `--write` replaces this Markdown file and its JSON companion.
