# Dum operational-entrypoint RSS baseline

Captured 2026-11-04T06:24:36.641Z from `98654d94f789587178cce11fd4e3793d99b5351a` with Bun 1.4.2 on darwin/arm64.

Contract: the whole Dum chain must add at most 30 MiB peak RSS over an empty module, using seven fresh processes and the median of within-process deltas. Isolated entrypoint measurements below are diagnostic. Raw samples are retained in the adjacent JSON artifact.

```text
PASS shared Dum import RSS: +27.469 MiB over an empty module; ceiling 30.000 MiB
  dumling: +6.891 MiB at this step; +6.891 MiB since the empty module
  dumrel: +2.797 MiB at this step; +9.734 MiB since the empty module
  dumdict/planning: +17.719 MiB at this step; +27.469 MiB since the empty module
  Seven-process median of paired peak deltas. Local import replay; not deployed tf-demo or operation memory.
```

Each probe runs against staged package manifests and built JavaScript, outside development TypeScript path aliases. Bun reports maxRSS in KiB; raw samples convert that value to bytes before calculating deltas.

Empty-module samples: `21594112`, `21594112`, `21594112`, `21594112`, `21594112` bytes; median `21594112` bytes.

## Canonical matrix

| Entrypoint | Classification | Representative operation | Import delta (MiB) | Import + operation delta (MiB) | Reachable schema/heavy dependencies |
| --- | --- | --- | ---: | ---: | --- |
| `dumling` | operational | parse unit | 4.844 | 5.438 | none |
| `dumling/types` | type-only | Structural declarations, with empty JavaScript. | — | — | — |
| `dumling/validation` | operational | validate feature bag | 1.703 | 1.891 | none |
| `dumling/package.json` | metadata | Package metadata. | — | — | — |
| `dumling/schema/*` | schema-authoring-exempt | Explicit schema or experiment authoring surface. | — | — | — |
| `dumrel` | operational | knowledge projection | 7.484 | 15.438 | none |
| `dumrel/types` | type-only | Structural declarations, with empty JavaScript. | — | — | — |
| `dumrel/schema` | schema-authoring-exempt | Explicit schema or experiment authoring surface. | — | — | — |
| `dumrel/package.json` | metadata | Package metadata. | — | — | — |
| `dumdict` | operational | parse record | 24.953 | 25.094 | none |
| `dumdict/schema` | schema-authoring-exempt | Explicit schema or experiment authoring surface. | — | — | — |
| `dumdict/pending` | operational | pending identity | 4.844 | 5.781 | none |
| `dumdict/planning` | operational | plan reading entry | 25.641 | 28.250 | none |
| `dumdict/inflection` | operational | project lemma tables | 7.297 | 8.844 | none |
| `dumdict/package.json` | metadata | Package metadata. | — | — | — |
| `dumdict/testing` | development-support | Storage conformance suite for adapter tests; imports bun:test and is never loaded at application runtime. | — | — | — |
| `dumling/validation-artifact` | development-support | Unlinked compiled validation that sibling generators link against; never loaded at application runtime. | — | — | — |
| `dumling/codegen` | development-support | Codegen-only route manifest and operation table that sibling generators read; the import policy keeps runtime code from loading it. | — | — | — |
| `dumling/compiled-validation` | operational | Validate through the shared rule protocol | 2.547 | 4.109 | none |
| `dumrel/validation-artifact` | development-support | Unlinked compiled validation that sibling generators link against; never loaded at application runtime. | — | — | — |
| `dumrel/compiled-validation` | operational | Validate through the shared rule protocol | 3.563 | 6.000 | none |
| `common-utils` | operational | Write canonical JSON | 1.031 | 1.672 | none |
| `common-utils/validation` | operational | Validate through the shared rule protocol | 0.641 | 1.250 | none |
| `common-utils/validation-compiler` | schema-authoring-exempt | Build-time Zod compilation and rule linking. | — | — | — |
| `common-utils/package.json` | metadata | Package metadata. | — | — | — |

## Interpretation

The shared import budget replaces the previous per-entrypoint 5/5.3 MiB limits. It measures Dumling → Dumrel → Dumdict planning from a bare runtime, as Convex's isolate loads them. Shared dependencies are counted once. This is a local package-import replay, not deployed tf-demo RSS, and excludes provider SDK, app initialization, and operations. Heavyweight and schema reachability remain a zero-tolerance rule for every operational surface.

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
