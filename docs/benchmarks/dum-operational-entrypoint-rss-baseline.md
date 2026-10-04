# Dum operational-entrypoint RSS baseline

Captured 2026-10-04T08:59:34.539Z from `3944990286f03dc7100112b411dcd9653e7327c7` with Bun 1.4.2 on darwin/arm64.

Contract: the whole Dum chain must add at most 30 MiB peak RSS after Effect is loaded, using seven fresh processes and the median of within-process deltas. Isolated entrypoint measurements below are diagnostic. Raw samples are retained in the adjacent JSON artifact.

```text
PASS shared Dum import RSS: +20.625 MiB after Effect; ceiling 30.000 MiB
  dumling: +3.188 MiB at this step; +3.188 MiB since Effect
  dumrel: +2.688 MiB at this step; +5.906 MiB since Effect
  dumdict/planning: +14.516 MiB at this step; +20.625 MiB since Effect
  Seven-process median of paired peak deltas. Local import replay; not deployed tf-demo or operation memory.
```

Each probe runs against staged package manifests and built JavaScript, outside development TypeScript path aliases. Bun reports maxRSS in KiB; raw samples convert that value to bytes before calculating deltas.

Empty-module samples: `18497536`, `18513920`, `18595840`, `18530304`, `18661376` bytes; median `18530304` bytes.

## Canonical matrix

| Entrypoint | Classification | Representative operation | Import delta (MiB) | Import + operation delta (MiB) | Reachable schema/heavy dependencies |
| --- | --- | --- | ---: | ---: | --- |
| `dumling` | operational | parse unit | 5.047 | 5.563 | none |
| `dumling/types` | type-only | Structural declarations, with empty JavaScript. | — | — | — |
| `dumling/validation` | operational | validate feature bag | 2.563 | 2.781 | none |
| `dumling/package.json` | metadata | Package metadata. | — | — | — |
| `dumling/schema/*` | schema-authoring-exempt | Explicit schema or experiment authoring surface. | — | — | — |
| `dumrel` | operational | knowledge projection | 7.484 | 15.641 | none |
| `dumrel/types` | type-only | Structural declarations, with empty JavaScript. | — | — | — |
| `dumrel/schema` | schema-authoring-exempt | Explicit schema or experiment authoring surface. | — | — | — |
| `dumrel/package.json` | metadata | Package metadata. | — | — | — |
| `dumdict` | operational | parse record | 24.594 | 24.672 | none |
| `dumdict/schema` | schema-authoring-exempt | Explicit schema or experiment authoring surface. | — | — | — |
| `dumdict/pending` | operational | pending identity | 5.188 | 5.594 | none |
| `dumdict/planning` | operational | plan reading entry | 25.281 | 29.719 | none |
| `dumdict/package.json` | metadata | Package metadata. | — | — | — |
| `dumdict/testing` | development-support | Storage conformance suite for adapter tests; imports bun:test and is never loaded at application runtime. | — | — | — |
| `dumling/validation-artifact` | development-support | Unlinked compiled validation that sibling generators link against; never loaded at application runtime. | — | — | — |
| `dumling/codegen` | development-support | Codegen-only route manifest and operation table that sibling generators read; the import policy keeps runtime code from loading it. | — | — | — |
| `dumling/compiled-validation` | operational | Validate through the shared rule protocol | 2.359 | 4.859 | none |
| `dumrel/validation-artifact` | development-support | Unlinked compiled validation that sibling generators link against; never loaded at application runtime. | — | — | — |
| `dumrel/compiled-validation` | operational | Validate through the shared rule protocol | 3.328 | 6.469 | none |
| `common-utils` | operational | Write canonical JSON | 0.875 | 1.453 | none |
| `common-utils/validation` | operational | Validate through the shared rule protocol | 0.313 | 0.891 | none |
| `common-utils/validation-compiler` | schema-authoring-exempt | Build-time Zod compilation and rule linking. | — | — | — |
| `common-utils/package.json` | metadata | Package metadata. | — | — | — |

## Interpretation

The shared import budget replaces the previous per-entrypoint 5/5.3 MiB limits. It measures Dumling → Dumrel → Dumdict planning after effect/Effect. Shared dependencies are counted once. This is a local package-import replay, not deployed tf-demo RSS, and excludes provider SDK, app initialization, and operations. Heavyweight and schema reachability remain a zero-tolerance rule for every operational surface.

The explicit schema/model-authoring escape hatches are `dumling/schema/*`, `dumrel/schema`, `dumdict/schema`, `common-utils/validation-compiler`. They are exempt from the operational budget; any schema reachability from an operational package root remains a violation rather than gaining an exemption.

A vocabulary or settings subpath is operational runtime data, so it is measured. Type-only JavaScript and `package.json` metadata are inventoried for exhaustiveness but not benchmarked.

Reachability is derived from the built public JavaScript graph. `zod` identifies schema/runtime weight; `openai` identifies the provider SDK loaded by a convenience entrypoint. An explicit `/schema` dependency reachable from an operational entrypoint is always reported even when Zod is also visible directly.

## Reproduce

```sh
bun run benchmark:dum-shared
bun run benchmark:dum-entrypoints
bun run benchmark:dum-entrypoints --write
```

`benchmark:dum-shared` rebuilds the packages and checks only the shared import budget. `benchmark:dum-entrypoints` also reports isolated diagnostics; `--write` replaces this Markdown file and its JSON companion.
