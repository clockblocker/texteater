# Dum operational-entrypoint RSS baseline

Captured 2026-09-14T04:58:43.229Z from `95e6ce99cbdaa654e0ffed105704f354455d2cd7` with Bun 1.4.2 on darwin/arm64.

Contract: the whole Dum chain must add at most 30 MiB peak RSS after Effect is loaded, using seven fresh processes and the median of within-process deltas. Isolated entrypoint measurements below are diagnostic. Raw samples are retained in the adjacent JSON artifact.

```text
PASS shared Dum import RSS: +12.750 MiB after Effect; ceiling 30.000 MiB
  dumling: +2.234 MiB at this step; +2.234 MiB since Effect
  dumrel: +0.516 MiB at this step; +2.703 MiB since Effect
  dumdict/runtime: +1.672 MiB at this step; +4.406 MiB since Effect
  dumgen: +8.281 MiB at this step; +12.750 MiB since Effect
  Seven-process median of paired peak deltas. Local import replay; not deployed tf-demo or operation memory.
```

Each probe runs against staged package manifests and built JavaScript, outside development TypeScript path aliases. Bun reports maxRSS in KiB; raw samples convert that value to bytes before calculating deltas.

Empty-module samples: `17350656`, `17350656`, `17252352`, `17301504`, `17285120` bytes; median `17301504` bytes.

## Canonical matrix

| Entrypoint | Classification | Representative operation | Import delta (MiB) | Import + operation delta (MiB) | Reachable schema/heavy dependencies |
| --- | --- | --- | ---: | ---: | --- |
| `dumling` | operational | parse unit | 2.047 | 3.422 | none |
| `dumling/types` | type-only | Structural declarations, with empty JavaScript. | — | — | — |
| `dumling/validation` | operational | validate feature bag | 1.547 | 1.563 | none |
| `dumling/package.json` | metadata | Package metadata. | — | — | — |
| `dumling/schema/*` | schema-authoring-exempt | Explicit schema or experiment authoring surface. | — | — | — |
| `dumrel` | operational | knowledge projection | 3.734 | 13.453 | none |
| `dumrel/types` | type-only | Structural declarations, with empty JavaScript. | — | — | — |
| `dumrel/schema` | schema-authoring-exempt | Explicit schema or experiment authoring surface. | — | — | — |
| `dumrel/package.json` | metadata | Package metadata. | — | — | — |
| `dumdict` | operational | parse record | 24.484 | 26.422 | none |
| `dumdict/schema` | schema-authoring-exempt | Explicit schema or experiment authoring surface. | — | — | — |
| `dumdict/runtime` | operational | parse record | 25.609 | 26.094 | none |
| `dumdict/relations` | operational | project relations | 4.438 | 6.406 | none |
| `dumdict/pending` | operational | pending identity | 2.422 | 2.922 | none |
| `dumdict/package.json` | metadata | Package metadata. | — | — | — |
| `dumdict/memory` | operational | session storage | 23.297 | 24.422 | none |
| `dumgen` | operational | resolve supplied target | 31.453 | 36.047 | none |
| `dumgen/types` | type-only | Structural declarations, with empty JavaScript. | — | — | — |
| `dumgen/schemas` | schema-authoring-exempt | Explicit schema or experiment authoring surface. | — | — | — |
| `dumgen/development` | schema-authoring-exempt | Explicit schema or experiment authoring surface. | — | — | — |
| `dumgen/package.json` | metadata | Package metadata. | — | — | — |

## Interpretation

The shared import budget replaces the previous per-entrypoint 5/5.3 MiB limits. It measures Dumling → Dumrel → Dumdict runtime → Dumgen after effect/Effect. Shared dependencies are counted once. This is a local package-import replay, not deployed tf-demo RSS, and excludes provider SDK, app initialization, and operations. Heavyweight and schema reachability remain a zero-tolerance rule for every operational surface.

The explicit schema/model-authoring escape hatches are `dumling/schema/*`, `dumrel/schema`, `dumdict/schema`, `dumgen/schemas`, `dumgen/development`. They are exempt from the operational budget; any schema reachability from an operational package root remains a violation rather than gaining an exemption.

A vocabulary or settings subpath is operational runtime data, so it is measured. Type-only JavaScript and `package.json` metadata are inventoried for exhaustiveness but not benchmarked.

Reachability is derived from the built public JavaScript graph. `zod` and `codec-builder-library` identify schema/runtime weight; `openai` identifies the provider SDK loaded by a convenience entrypoint. An explicit `/schema` dependency reachable from an operational entrypoint is always reported even when Zod is also visible directly.

## Reproduce

```sh
bun run benchmark:dum-shared
bun run benchmark:dum-entrypoints
bun run benchmark:dum-entrypoints --write
```

`benchmark:dum-shared` rebuilds the packages and checks only the shared import budget. `benchmark:dum-entrypoints` also reports isolated diagnostics; `--write` replaces this Markdown file and its JSON companion.
