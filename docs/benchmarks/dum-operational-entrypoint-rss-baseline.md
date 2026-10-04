# Dum operational-entrypoint RSS baseline

Captured 2026-10-04T05:49:58.893Z from `8bcf7caa361ba67a8e16c929cf04422af14c75aa` with Bun 1.4.2 on darwin/arm64.

Contract: the whole Dum chain must add at most 30 MiB peak RSS after Effect is loaded, using seven fresh processes and the median of within-process deltas. Isolated entrypoint measurements below are diagnostic. Raw samples are retained in the adjacent JSON artifact.

```text
PASS shared Dum import RSS: +20.859 MiB after Effect; ceiling 30.000 MiB
  dumling: +3.563 MiB at this step; +3.563 MiB since Effect
  dumrel: +2.781 MiB at this step; +6.266 MiB since Effect
  dumdict/runtime: +14.578 MiB at this step; +20.859 MiB since Effect
  Seven-process median of paired peak deltas. Local import replay; not deployed tf-demo or operation memory.
```

Each probe runs against staged package manifests and built JavaScript, outside development TypeScript path aliases. Bun reports maxRSS in KiB; raw samples convert that value to bytes before calculating deltas.

Empty-module samples: `18350080`, `18235392`, `18300928`, `18350080`, `18317312` bytes; median `18317312` bytes.

## Canonical matrix

| Entrypoint | Classification | Representative operation | Import delta (MiB) | Import + operation delta (MiB) | Reachable schema/heavy dependencies |
| --- | --- | --- | ---: | ---: | --- |
| `dumling` | operational | parse unit | 5.516 | 5.859 | none |
| `dumling/types` | type-only | Structural declarations, with empty JavaScript. | — | — | — |
| `dumling/validation` | operational | validate feature bag | 1.703 | 1.922 | none |
| `dumling/package.json` | metadata | Package metadata. | — | — | — |
| `dumling/schema/*` | schema-authoring-exempt | Explicit schema or experiment authoring surface. | — | — | — |
| `dumrel` | operational | knowledge projection | 7.750 | 15.656 | none |
| `dumrel/types` | type-only | Structural declarations, with empty JavaScript. | — | — | — |
| `dumrel/schema` | schema-authoring-exempt | Explicit schema or experiment authoring surface. | — | — | — |
| `dumrel/package.json` | metadata | Package metadata. | — | — | — |
| `dumdict` | operational | parse record | 32.328 | 32.578 | none |
| `dumdict/schema` | schema-authoring-exempt | Explicit schema or experiment authoring surface. | — | — | — |
| `dumdict/runtime` | operational | parse record | 32.250 | 31.969 | none |
| `dumdict/pending` | operational | pending identity | 5.656 | 6.141 | none |
| `dumdict/planning` | operational | plan reading entry | 25.328 | 29.531 | none |
| `dumdict/package.json` | metadata | Package metadata. | — | — | — |
| `dumdict/memory` | operational | session storage | 16.219 | 16.813 | none |
| `dumling/validation-artifact` | development-support | Unlinked compiled validation that sibling generators link against; never loaded at application runtime. | — | — | — |
| `dumling/compiled-validation` | operational | Validate through the shared rule protocol | 3.297 | 5.188 | none |
| `dumrel/validation-artifact` | development-support | Unlinked compiled validation that sibling generators link against; never loaded at application runtime. | — | — | — |
| `dumrel/compiled-validation` | operational | Validate through the shared rule protocol | 4.703 | 6.578 | none |
| `dumval/runtime` | operational | Validate through the shared rule protocol | 1.516 | 2.172 | none |
| `dumval/compiler` | schema-authoring-exempt | Build-time Zod compilation and rule linking. | — | — | — |
| `dumval/package.json` | metadata | Package metadata. | — | — | — |

## Interpretation

The shared import budget replaces the previous per-entrypoint 5/5.3 MiB limits. It measures Dumling → Dumrel → Dumdict runtime after effect/Effect. Shared dependencies are counted once. This is a local package-import replay, not deployed tf-demo RSS, and excludes provider SDK, app initialization, and operations. Heavyweight and schema reachability remain a zero-tolerance rule for every operational surface.

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
