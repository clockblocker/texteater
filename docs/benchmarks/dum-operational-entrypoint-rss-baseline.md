# Dum operational-entrypoint RSS baseline

Captured 2026-08-24T07:51:16.285Z from `e3cfd872193f75123d30a82d6493b28b900ed023` with Bun 1.3.14 on darwin/arm64.

Contract: five fresh Bun processes per measurement; median max RSS delta over an empty imported module; import-only must remain below 5 MiB and import-plus-operation must remain at or below 5.3 MiB. Raw byte samples are retained in the adjacent JSON artifact.

Empty-module samples: `31211520`, `31391744`, `31539200`, `31408128`, `31342592` bytes; median `31391744` bytes.

## Canonical matrix

| Entrypoint | Classification | Representative operation | Import delta (MiB) | Import + operation delta (MiB) | Reachable schema/heavy dependencies |
| --- | --- | --- | ---: | ---: | --- |
| `dumling` | operational | Parse a valid German NOUN Lemma through the language API. | 3.516 | 4.188 | none |
| `dumling/types` | type-only | Published JavaScript is empty; the subpath is a type surface. | — | — | — |
| `dumling/schema` | schema-authoring-exempt | Deliberately Zod-bearing public schema composition surface. | — | — | — |
| `dumling/dangerously-heavy-schema-tree` | schema-authoring-exempt | Deliberately dangerous route-specific schema tree costing roughly 100 MiB RSS. | — | — | — |
| `dumling/id` | operational | Encode and decode a canonical Lemma ID through the lean codec facade. | 1.938 | 3.141 | none |
| `dumling/reading` | operational | Compute the stable fingerprint of a Reading. | 0.984 | 1.359 | none |
| `dumling/vocabulary` | operational | Read and verify the public Dumling runtime vocabulary. | 0.813 | 0.844 | none |
| `dumling/fixed` | operational | Read and verify the fixed German determiner catalog. | 4.969 | 5.219 | none |
| `dumling/package.json` | metadata | Package metadata, not executable application code. | — | — | — |
| `dumrel` | operational | Apply a normalized Definition Knowledge Change. | 3.969 | 4.906 | none |
| `dumrel/types` | type-only | Published JavaScript is empty; the subpath is a type surface. | — | — | — |
| `dumrel/relations` | operational | Project a minimal direct Semantic Relation graph. | 1.281 | 1.641 | none |
| `dumrel/grammatical-relations` | operational | Project an empty Grammatical Relation claim set. | 0.922 | 0.938 | none |
| `dumrel/schema` | schema-authoring-exempt | Deliberately Zod-bearing public schema composition surface. | — | — | — |
| `dumrel/settings` | operational | Read and verify the frozen default Knowledge Settings. | 0.859 | 0.953 | none |
| `dumrel/vocabulary` | operational | Read and verify the public relation vocabulary. | 0.750 | 0.734 | none |
| `dumrel/fixed` | operational | Resolve fixed Knowledge for a catalogued German determiner Reading. | 24.406 | 24.656 | none |
| `dumrel/package.json` | metadata | Package metadata, not executable application code. | — | — | — |
| `dumdict` | operational | Apply a Definition Knowledge Change to a Reading Entry. | 27.641 | 28.375 | none |
| `dumdict/schema` | schema-authoring-exempt | Deliberately Zod-bearing public schema composition surface. | — | — | — |
| `dumdict/dangerously-heavy-schema-tree` | schema-authoring-exempt | Deliberately dangerous language-specific schema tree costing roughly 100 MiB RSS. | — | — | — |
| `dumdict/runtime` | operational | Apply a Definition Knowledge Change to a Reading Entry. | 27.656 | 28.281 | none |
| `dumdict/relations` | operational | Project an empty learner Semantic Relation inventory. | 1.344 | 1.563 | none |
| `dumdict/package.json` | metadata | Package metadata, not executable application code. | — | — | — |
| `dumgen` | operational | Build Dumgen with an injected no-network model SDK. | 4.797 | 4.922 | none |
| `dumgen/projection` | operational | Project a grammatical target from Segments. | 0.781 | 0.813 | none |
| `dumgen/schema` | schema-authoring-exempt | Deliberately Zod-bearing public model and DTO schema composition surface. | — | — | — |
| `dumgen/model-authoring` | schema-authoring-exempt | Deliberately Zod-bearing prompt and structured-output authoring surface. | — | — | — |
| `dumgen/knowledge` | operational | Build Knowledge generation with an injected no-network SDK. | 4.109 | 4.188 | none |
| `dumgen/knowledge-runtime` | operational | Build Knowledge generation with an injected no-network SDK. | 4.094 | 4.156 | none |
| `dumgen/openai-fetch` | operational | Perform a no-network unstructured Responses operation. | 1.281 | 2.203 | none |
| `dumgen/runtime` | operational | Build Dumgen runtime with injected no-network dependencies. | 4.703 | 4.891 | none |
| `dumgen/runtime-prompt-data` | operational | Read the generated compressed prompt payload for sidecar-free runtime bundlers. | 0.594 | 0.734 | none |
| `dumgen/vocabulary` | operational | Read and verify the public Dumgen runtime vocabulary. | 0.703 | 0.703 | none |
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
