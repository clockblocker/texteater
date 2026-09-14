# Dum operational-entrypoint RSS baseline

Captured 2026-09-14T05:58:24.592Z from `33a8cbd70e0db77f6383f504729442a18cd2af83` with Bun 1.4.2 on darwin/arm64.

Contract: the whole Dum chain must add at most 30 MiB peak RSS after Effect is loaded, using seven fresh processes and the median of within-process deltas. Isolated entrypoint measurements below are diagnostic. Raw samples are retained in the adjacent JSON artifact.

```text
PASS shared Dum import RSS: +12.234 MiB after Effect; ceiling 30.000 MiB
  dumling: +2.453 MiB at this step; +2.453 MiB since Effect
  dumrel: +0.344 MiB at this step; +2.938 MiB since Effect
  dumdict/runtime: +0.938 MiB at this step; +3.891 MiB since Effect
  dumgen: +8.141 MiB at this step; +12.234 MiB since Effect
  Seven-process median of paired peak deltas. Local import replay; not deployed tf-demo or operation memory.
```

Each probe runs against staged package manifests and built JavaScript, outside development TypeScript path aliases. Bun reports maxRSS in KiB; raw samples convert that value to bytes before calculating deltas.

Empty-module samples: `16924672`, `17186816`, `17039360`, `17121280`, `16728064` bytes; median `17039360` bytes.

## Canonical matrix

| Entrypoint | Classification | Representative operation | Import delta (MiB) | Import + operation delta (MiB) | Reachable schema/heavy dependencies |
| --- | --- | --- | ---: | ---: | --- |
| `dumling` | operational | parse unit | 5.172 | 5.813 | none |
| `dumling/types` | type-only | Structural declarations, with empty JavaScript. | — | — | — |
| `dumling/validation` | operational | validate feature bag | 1.516 | 1.813 | none |
| `dumling/package.json` | metadata | Package metadata. | — | — | — |
| `dumling/schema/*` | schema-authoring-exempt | Explicit schema or experiment authoring surface. | — | — | — |
| `dumrel` | operational | knowledge projection | 6.813 | 14.859 | none |
| `dumrel/types` | type-only | Structural declarations, with empty JavaScript. | — | — | — |
| `dumrel/schema` | schema-authoring-exempt | Explicit schema or experiment authoring surface. | — | — | — |
| `dumrel/package.json` | metadata | Package metadata. | — | — | — |
| `dumdict` | operational | parse record | 26.469 | 26.500 | none |
| `dumdict/schema` | schema-authoring-exempt | Explicit schema or experiment authoring surface. | — | — | — |
| `dumdict/runtime` | operational | parse record | 26.047 | 26.172 | none |
| `dumdict/relations` | operational | project relations | 7.422 | 8.031 | none |
| `dumdict/pending` | operational | pending identity | 5.266 | 5.828 | none |
| `dumdict/package.json` | metadata | Package metadata. | — | — | — |
| `dumdict/memory` | operational | session storage | 23.891 | 24.922 | none |
| `dumgen` | operational | resolve supplied target | 32.938 | 36.641 | none |
| `dumgen/types` | type-only | Structural declarations, with empty JavaScript. | — | — | — |
| `dumgen/schemas` | schema-authoring-exempt | Explicit schema or experiment authoring surface. | — | — | — |
| `dumgen/development` | schema-authoring-exempt | Explicit schema or experiment authoring surface. | — | — | — |
| `dumgen/package.json` | metadata | Package metadata. | — | — | — |
| `dumling/compiled-validation` | operational | Validate through the shared rule protocol | 3.094 | 4.781 | none |
| `dumrel/compiled-validation` | operational | Validate through the shared rule protocol | 4.188 | 5.781 | none |
| `dumval/runtime` | operational | Validate through the shared rule protocol | 1.234 | 1.938 | none |
| `dumval/compiler` | schema-authoring-exempt | Build-time Zod compilation and rule linking. | — | — | — |
| `dumval/package.json` | metadata | Package metadata. | — | — | — |

## Interpretation

The shared import budget replaces the previous per-entrypoint 5/5.3 MiB limits. It measures Dumling → Dumrel → Dumdict runtime → Dumgen after effect/Effect. Shared dependencies are counted once. This is a local package-import replay, not deployed tf-demo RSS, and excludes provider SDK, app initialization, and operations. Heavyweight and schema reachability remain a zero-tolerance rule for every operational surface.

The explicit schema/model-authoring escape hatches are `dumling/schema/*`, `dumrel/schema`, `dumdict/schema`, `dumgen/schemas`, `dumgen/development`, `dumval/compiler`. They are exempt from the operational budget; any schema reachability from an operational package root remains a violation rather than gaining an exemption.

A vocabulary or settings subpath is operational runtime data, so it is measured. Type-only JavaScript and `package.json` metadata are inventoried for exhaustiveness but not benchmarked.

Reachability is derived from the built public JavaScript graph. `zod` and `codec-builder-library` identify schema/runtime weight; `openai` identifies the provider SDK loaded by a convenience entrypoint. An explicit `/schema` dependency reachable from an operational entrypoint is always reported even when Zod is also visible directly.

## Reproduce

```sh
bun run benchmark:dum-shared
bun run benchmark:dum-entrypoints
bun run benchmark:dum-entrypoints --write
```

`benchmark:dum-shared` rebuilds the packages and checks only the shared import budget. `benchmark:dum-entrypoints` also reports isolated diagnostics; `--write` replaces this Markdown file and its JSON companion.
