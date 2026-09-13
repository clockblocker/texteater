# Dum operational-entrypoint RSS baseline

Captured 2026-09-13T15:44:04.302Z from `f47c96a1f602096f911b46cfba6f42ae661fec4c` with Bun 1.4.2 on darwin/arm64.

Contract: five fresh Bun processes per measurement; median max RSS delta over an empty imported module. Strict surfaces must keep import-only below 5 MiB and import-plus-operation at or below 5.3 MiB. Effect workflows are measured and reported without an RSS cap. Raw byte samples are retained in the adjacent JSON artifact.

Each probe runs against staged package manifests and built JavaScript, outside development TypeScript path aliases. Bun reports maxRSS in KiB; raw samples convert that value to bytes before calculating deltas.

Empty-module samples: `17170432`, `17154048`, `17170432`, `17252352`, `17186816` bytes; median `17170432` bytes.

## Canonical matrix

| Entrypoint | Classification | Representative operation | Import delta (MiB) | Import + operation delta (MiB) | Reachable schema/heavy dependencies |
| --- | --- | --- | ---: | ---: | --- |
| `dumling` | operational | parse unit | 2.875 | 3.406 | none |
| `dumling/types` | type-only | Structural declarations, with empty JavaScript. | — | — | — |
| `dumling/validation` | operational | validate feature bag | 1.469 | 1.750 | none |
| `dumling/package.json` | metadata | Package metadata. | — | — | — |
| `dumling/schema/*` | schema-authoring-exempt | Explicit schema or experiment authoring surface. | — | — | — |
| `dumrel` | operational | knowledge projection | 4.969 | 13.313 | none |
| `dumrel/types` | type-only | Structural declarations, with empty JavaScript. | — | — | — |
| `dumrel/schema` | schema-authoring-exempt | Explicit schema or experiment authoring surface. | — | — | — |
| `dumrel/package.json` | metadata | Package metadata. | — | — | — |
| `dumdict` | operational | parse record | 27.500 | 27.813 | none |
| `dumdict/schema` | schema-authoring-exempt | Explicit schema or experiment authoring surface. | — | — | — |
| `dumdict/runtime` | operational | parse record | 27.953 | 27.609 | none |
| `dumdict/relations` | operational | project relations | 5.563 | 6.266 | none |
| `dumdict/pending` | operational | pending identity | 3.391 | 3.781 | none |
| `dumdict/package.json` | metadata | Package metadata. | — | — | — |
| `dumdict/memory` | operational | session storage | 25.313 | 25.750 | none |
| `dumgen` | operational | resolve supplied target | 106.781 | 107.859 | none |
| `dumgen/types` | type-only | Structural declarations, with empty JavaScript. | — | — | — |
| `dumgen/schemas` | schema-authoring-exempt | Explicit schema or experiment authoring surface. | — | — | — |
| `dumgen/development` | schema-authoring-exempt | Explicit schema or experiment authoring surface. | — | — | — |
| `dumgen/package.json` | metadata | Package metadata. | — | — | — |

## Interpretation

The user-approved 5.3 MiB operation ceiling is one global allowance for observed five-process median measurement noise around 5 MiB, not a per-package waiver. It applies only to strict surfaces. Effect workflow RSS is retained as an observation because its runtime cost is no longer a proxy for schema loading. Heavyweight and schema reachability remain a zero-tolerance rule for every operational surface.

The explicit schema/model-authoring escape hatches are `dumling/schema/*`, `dumrel/schema`, `dumdict/schema`, `dumgen/schemas`, `dumgen/development`. They are exempt from the operational budget; any schema reachability from an operational package root remains a violation rather than gaining an exemption.

A vocabulary or settings subpath is operational runtime data, so it is measured. Type-only JavaScript and `package.json` metadata are inventoried for exhaustiveness but not benchmarked.

Reachability is derived from the built public JavaScript graph. `zod` and `codec-builder-library` identify schema/runtime weight; `openai` identifies the provider SDK loaded by a convenience entrypoint. An explicit `/schema` dependency reachable from an operational entrypoint is always reported even when Zod is also visible directly.

## Reproduce

```sh
bun run benchmark:dum-entrypoints
bun run benchmark:dum-entrypoints --write
```

The first command rebuilds the four packages and prints the report. `--write` also replaces this Markdown file and its JSON companion.
