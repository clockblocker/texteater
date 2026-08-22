# Dum operational-entrypoint RSS baseline

Captured 2026-08-22T10:30:37.356Z from `5940af61cb1d13b3ff335d2c525bbbc44f42fd5b` with Bun 1.3.14 on darwin/arm64.

Contract: five fresh Bun processes per measurement; median max RSS delta over an empty imported module; import-only must remain below 5 MiB and import-plus-operation must remain at or below 5.3 MiB. Raw byte samples are retained in the adjacent JSON artifact.

Empty-module samples: `31178752`, `31145984`, `31195136`, `31326208`, `31244288` bytes; median `31195136` bytes.

## Canonical matrix

| Entrypoint | Classification | Representative operation | Import delta (MiB) | Import + operation delta (MiB) | Reachable schema/heavy dependencies |
| --- | --- | --- | ---: | ---: | --- |
| `dumling` | operational | Parse a valid German NOUN Lemma through the language API. | 3.656 | 4.141 | none |
| `dumling/types` | type-only | Published JavaScript is empty; the subpath is a type surface. | — | — | — |
| `dumling/schema` | schema-authoring-exempt | Deliberately Zod-bearing public schema composition surface. | — | — | — |
| `dumling/dangerously-heavy-schema-tree` | schema-authoring-exempt | Deliberately dangerous route-specific schema tree costing roughly 100 MiB RSS. | — | — | — |
| `dumling/id` | operational | Encode and decode a canonical Lemma ID through the lean codec facade. | 1.906 | 3.125 | none |
| `dumling/reading` | operational | Compute the stable fingerprint of a Reading. | 0.906 | 1.250 | none |
| `dumling/vocabulary` | operational | Read and verify the public Dumling runtime vocabulary. | 0.703 | 0.781 | none |
| `dumling/fixed` | operational | Read and verify the fixed German determiner catalog. | 3.922 | 3.906 | none |
| `dumling/package.json` | metadata | Package metadata, not executable application code. | — | — | — |
| `dumrel` | operational | Apply a normalized Definition Knowledge Change. | 3.859 | 4.844 | none |
| `dumrel/types` | type-only | Published JavaScript is empty; the subpath is a type surface. | — | — | — |
| `dumrel/relations` | operational | Project a minimal direct Semantic Relation graph. | 1.344 | 1.531 | none |
| `dumrel/schema` | schema-authoring-exempt | Deliberately Zod-bearing public schema composition surface. | — | — | — |
| `dumrel/settings` | operational | Read and verify the frozen default Knowledge Settings. | 0.969 | 0.922 | none |
| `dumrel/vocabulary` | operational | Read and verify the public relation vocabulary. | 0.781 | 0.828 | none |
| `dumrel/fixed` | operational | Resolve fixed Knowledge for a catalogued German determiner Reading. | 4.328 | 5.188 | none |
| `dumrel/package.json` | metadata | Package metadata, not executable application code. | — | — | — |
| `dumdict` | operational | Apply a Definition Knowledge Change to a Reading Entry. | 3.938 | 4.969 | none |
| `dumdict/schema` | schema-authoring-exempt | Deliberately Zod-bearing public schema composition surface. | — | — | — |
| `dumdict/dangerously-heavy-schema-tree` | schema-authoring-exempt | Deliberately dangerous language-specific schema tree costing roughly 100 MiB RSS. | — | — | — |
| `dumdict/runtime` | operational | Apply a Definition Knowledge Change to a Reading Entry. | 3.891 | 5.000 | none |
| `dumdict/relations` | operational | Project an empty learner Semantic Relation inventory. | 1.563 | 1.703 | none |
| `dumdict/package.json` | metadata | Package metadata, not executable application code. | — | — | — |
| `dumgen` | operational | Build Dumgen with an injected no-network model SDK. | 11.219 | 11.438 | none |
| `dumgen/projection` | operational | Project a grammatical target from Segments. | 0.938 | 1.016 | none |
| `dumgen/schema` | schema-authoring-exempt | Deliberately Zod-bearing public model and DTO schema composition surface. | — | — | — |
| `dumgen/model-authoring` | schema-authoring-exempt | Deliberately Zod-bearing prompt and structured-output authoring surface. | — | — | — |
| `dumgen/knowledge` | operational | Build Knowledge generation with an injected no-network SDK. | 10.469 | 10.453 | none |
| `dumgen/knowledge-runtime` | operational | Build Knowledge generation with an injected no-network SDK. | 10.141 | 10.188 | none |
| `dumgen/openai-fetch` | operational | Perform a no-network unstructured Responses operation. | 1.141 | 1.859 | none |
| `dumgen/runtime` | operational | Build Dumgen runtime with injected no-network dependencies. | 10.500 | 10.625 | none |
| `dumgen/runtime-prompt-data` | operational | Read the generated compressed prompt payload for sidecar-free runtime bundlers. | 0.813 | 0.969 | none |
| `dumgen/vocabulary` | operational | Read and verify the public Dumgen runtime vocabulary. | 0.859 | 0.922 | none |
| `dumgen/package.json` | metadata | Package metadata, not executable application code. | — | — | — |

## Interpretation

The user-approved 5.3 MiB operation ceiling is one global allowance for observed five-process median measurement noise around 5 MiB, not a per-package waiver. The import ceiling remains strictly below 5 MiB, and heavyweight/schema reachability remains a strict zero-tolerance rule.

The explicit schema/model-authoring escape hatches are `dumling/schema`, `dumling/dangerously-heavy-schema-tree`, `dumrel/schema`, `dumdict/schema`, `dumdict/dangerously-heavy-schema-tree`, `dumgen/schema`, `dumgen/model-authoring`. They are exempt from the operational budget; any schema reachability from an operational package root remains a violation rather than gaining an exemption.

A vocabulary or settings subpath is operational runtime data, so it is measured. Type-only JavaScript and `package.json` metadata are inventoried for exhaustiveness but not benchmarked.

Reachability is derived from the built public JavaScript graph. `zod` and `codec-builder-library` identify schema/runtime weight; `openai` identifies the provider SDK loaded by a convenience entrypoint. An explicit `/schema` dependency reachable from an operational entrypoint is always reported even when Zod is also visible directly.

## Reproduce

```sh
bun run benchmark:dum-entrypoints
bun run benchmark:dum-entrypoints --write
```

The first command rebuilds the four packages and prints the report. `--write` also replaces this Markdown file and its JSON companion.
