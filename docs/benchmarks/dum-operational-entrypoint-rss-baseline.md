# Dum operational-entrypoint RSS baseline

Captured 2026-09-18T09:20:50.616Z from `b563197e57e34b20491147bfc1b68477d6a77430` with Bun 1.4.2 on darwin/arm64.

Contract: the whole Dum chain must add at most 30 MiB peak RSS after Effect is loaded, using seven fresh processes and the median of within-process deltas. Isolated entrypoint measurements below are diagnostic. Raw samples are retained in the adjacent JSON artifact.

```text
FAIL shared Dum import RSS: +37.469 MiB after Effect; ceiling 30.000 MiB
  dumling: +2.453 MiB at this step; +2.453 MiB since Effect
  dumrel: +0.594 MiB at this step; +3.109 MiB since Effect
  dumdict/runtime: +1.500 MiB at this step; +4.938 MiB since Effect
  dumgen: +32.531 MiB at this step; +37.469 MiB since Effect
  Seven-process median of paired peak deltas. Local import replay; not deployed tf-demo or operation memory.
```

Each probe runs against staged package manifests and built JavaScript, outside development TypeScript path aliases. Bun reports maxRSS in KiB; raw samples convert that value to bytes before calculating deltas.

Empty-module samples: `17809408`, `17219584`, `17219584`, `17137664`, `17154048` bytes; median `17219584` bytes.

## Canonical matrix

| Entrypoint | Classification | Representative operation | Import delta (MiB) | Import + operation delta (MiB) | Reachable schema/heavy dependencies |
| --- | --- | --- | ---: | ---: | --- |
| `dumling` | operational | parse unit | 5.656 | 5.672 | none |
| `dumling/types` | type-only | Structural declarations, with empty JavaScript. | — | — | — |
| `dumling/validation` | operational | validate feature bag | 1.484 | 1.828 | none |
| `dumling/package.json` | metadata | Package metadata. | — | — | — |
| `dumling/schema/*` | schema-authoring-exempt | Explicit schema or experiment authoring surface. | — | — | — |
| `dumrel` | operational | knowledge projection | 7.031 | 14.688 | none |
| `dumrel/types` | type-only | Structural declarations, with empty JavaScript. | — | — | — |
| `dumrel/schema` | schema-authoring-exempt | Explicit schema or experiment authoring surface. | — | — | — |
| `dumrel/package.json` | metadata | Package metadata. | — | — | — |
| `dumdict` | operational | parse record | 26.281 | 26.594 | none |
| `dumdict/schema` | schema-authoring-exempt | Explicit schema or experiment authoring surface. | — | — | — |
| `dumdict/runtime` | operational | parse record | 26.188 | 26.516 | none |
| `dumdict/relations` | operational | project relations | 6.859 | 7.656 | none |
| `dumdict/pending` | operational | pending identity | 5.563 | 6.094 | none |
| `dumdict/planning` | operational | plan reading entry | 8.797 | 18.703 | none |
| `dumdict/package.json` | metadata | Package metadata. | — | — | — |
| `dumdict/memory` | operational | session storage | 25.391 | 25.766 | none |
| `dumgen` | operational | resolve supplied target | 58.203 | 60.375 | none |
| `dumgen/types` | type-only | Structural declarations, with empty JavaScript. | — | — | — |
| `dumgen/authored` | operational | select authored article | 16.766 | 16.750 | none |
| `dumgen/validation` | operational | validate encounter | 8.891 | 9.563 | none |
| `dumgen/schemas` | schema-authoring-exempt | Explicit schema or experiment authoring surface. | — | — | — |
| `dumgen/development` | schema-authoring-exempt | Explicit schema or experiment authoring surface. | — | — | — |
| `dumgen/package.json` | metadata | Package metadata. | — | — | — |
| `dumling/compiled-validation` | operational | Validate through the shared rule protocol | 3.250 | 5.047 | none |
| `dumrel/compiled-validation` | operational | Validate through the shared rule protocol | 4.188 | 6.063 | none |
| `dumval/runtime` | operational | Validate through the shared rule protocol | 1.453 | 2.141 | none |
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
