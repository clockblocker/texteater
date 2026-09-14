# Dum operational-entrypoint RSS baseline

Captured 2026-09-14T04:13:20.199Z from `eb7ebd84b973ea7e586f591117e06d2bcfc81aca` with Bun 1.4.2 on darwin/arm64.

Contract: the whole Dum chain must add at most 30 MiB peak RSS after Effect is loaded, using seven fresh processes and the median of within-process deltas. Isolated entrypoint measurements below are diagnostic. Raw samples are retained in the adjacent JSON artifact.

```text
PASS shared Dum import RSS: +21.406 MiB after Effect; ceiling 30.000 MiB
  dumling: +2.078 MiB at this step; +2.078 MiB since Effect
  dumrel: +1.031 MiB at this step; +3.172 MiB since Effect
  dumdict/runtime: +1.516 MiB at this step; +4.641 MiB since Effect
  dumgen: +16.719 MiB at this step; +21.406 MiB since Effect
  Seven-process median of paired peak deltas. Local import replay; not deployed tf-demo or operation memory.
```

Each probe runs against staged package manifests and built JavaScript, outside development TypeScript path aliases. Bun reports maxRSS in KiB; raw samples convert that value to bytes before calculating deltas.

Empty-module samples: `17203200`, `17170432`, `17121280`, `17154048`, `17154048` bytes; median `17154048` bytes.

## Canonical matrix

| Entrypoint | Classification | Representative operation | Import delta (MiB) | Import + operation delta (MiB) | Reachable schema/heavy dependencies |
| --- | --- | --- | ---: | ---: | --- |
| `dumling` | operational | parse unit | 2.891 | 3.453 | none |
| `dumling/types` | type-only | Structural declarations, with empty JavaScript. | — | — | — |
| `dumling/validation` | operational | validate feature bag | 1.516 | 1.734 | none |
| `dumling/package.json` | metadata | Package metadata. | — | — | — |
| `dumling/schema/*` | schema-authoring-exempt | Explicit schema or experiment authoring surface. | — | — | — |
| `dumrel` | operational | knowledge projection | 4.969 | 12.953 | none |
| `dumrel/types` | type-only | Structural declarations, with empty JavaScript. | — | — | — |
| `dumrel/schema` | schema-authoring-exempt | Explicit schema or experiment authoring surface. | — | — | — |
| `dumrel/package.json` | metadata | Package metadata. | — | — | — |
| `dumdict` | operational | parse record | 27.266 | 26.859 | none |
| `dumdict/schema` | schema-authoring-exempt | Explicit schema or experiment authoring surface. | — | — | — |
| `dumdict/runtime` | operational | parse record | 26.906 | 27.703 | none |
| `dumdict/relations` | operational | project relations | 5.641 | 6.188 | none |
| `dumdict/pending` | operational | pending identity | 3.422 | 3.891 | none |
| `dumdict/package.json` | metadata | Package metadata. | — | — | — |
| `dumdict/memory` | operational | session storage | 25.094 | 25.438 | none |
| `dumgen` | operational | resolve supplied target | 39.391 | 42.328 | none |
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
