# Dum operational-entrypoint RSS baseline

Captured 2026-08-21T19:25:08.202Z from `14c944cfd39a8687a46b2b61b0c985c679dd695f` with Bun 1.3.14 on darwin/arm64.

Contract: five fresh Bun processes per measurement; median max RSS delta over an empty imported module; import-only must remain below 5 MiB and import-plus-operation must remain at or below 5.3 MiB. Raw byte samples are retained in the adjacent JSON artifact.

Empty-module samples: `31244288`, `31227904`, `31178752`, `30998528`, `31162368` bytes; median `31178752` bytes.

## Canonical matrix

| Entrypoint | Classification | Representative operation | Import delta (MiB) | Import + operation delta (MiB) | Reachable schema/heavy dependencies |
| --- | --- | --- | ---: | ---: | --- |
| `dumling` | operational | Parse a valid German NOUN Lemma through the language API. | 3.516 | 3.969 | none |
| `dumling/types` | type-only | Published JavaScript is empty; the subpath is a type surface. | — | — | — |
| `dumling/schema` | schema-authoring-exempt | Deliberately Zod-bearing public schema composition surface. | — | — | — |
| `dumling/dangerously-heavy-schema-tree` | schema-authoring-exempt | Deliberately dangerous route-specific schema tree costing roughly 100 MiB RSS. | — | — | — |
| `dumling/id` | operational | Encode and decode a canonical Lemma ID through the lean codec facade. | 1.844 | 3.109 | none |
| `dumling/reading` | operational | Compute the stable fingerprint of a Reading. | 0.828 | 1.266 | none |
| `dumling/vocabulary` | operational | Read and verify the public Dumling runtime vocabulary. | 0.734 | 0.781 | none |
| `dumling/package.json` | metadata | Package metadata, not executable application code. | — | — | — |
| `dumrel` | operational | Apply a normalized Definition Knowledge Change. | 3.906 | 4.859 | none |
| `dumrel/types` | type-only | Published JavaScript is empty; the subpath is a type surface. | — | — | — |
| `dumrel/relations` | operational | Project a minimal direct Semantic Relation graph. | 1.328 | 1.547 | none |
| `dumrel/schema` | schema-authoring-exempt | Deliberately Zod-bearing public schema composition surface. | — | — | — |
| `dumrel/settings` | operational | Read and verify the frozen default Knowledge Settings. | 0.984 | 1.016 | none |
| `dumrel/vocabulary` | operational | Read and verify the public relation vocabulary. | 0.781 | 0.859 | none |
| `dumrel/package.json` | metadata | Package metadata, not executable application code. | — | — | — |
| `dumdict` | operational | Apply a Definition Knowledge Change to a Reading Entry. | 3.672 | 4.734 | none |
| `dumdict/schema` | schema-authoring-exempt | Deliberately Zod-bearing public schema composition surface. | — | — | — |
| `dumdict/dangerously-heavy-schema-tree` | schema-authoring-exempt | Deliberately dangerous language-specific schema tree costing roughly 100 MiB RSS. | — | — | — |
| `dumdict/runtime` | operational | Apply a Definition Knowledge Change to a Reading Entry. | 3.656 | 4.563 | none |
| `dumdict/relations` | operational | Project an empty learner Semantic Relation inventory. | 1.359 | 1.594 | none |
| `dumdict/package.json` | metadata | Package metadata, not executable application code. | — | — | — |
| `dumgen` | operational | Build Dumgen with an injected no-network model SDK. | 4.641 | 4.859 | none |
| `dumgen/projection` | operational | Project a grammatical target from Segments. | 0.953 | 1.063 | none |
| `dumgen/schema` | schema-authoring-exempt | Deliberately Zod-bearing public model and DTO schema composition surface. | — | — | — |
| `dumgen/model-authoring` | schema-authoring-exempt | Deliberately Zod-bearing prompt and structured-output authoring surface. | — | — | — |
| `dumgen/knowledge` | operational | Build Knowledge generation with an injected no-network SDK. | 4.094 | 4.188 | none |
| `dumgen/knowledge-runtime` | operational | Build Knowledge generation with an injected no-network SDK. | 4.063 | 4.141 | none |
| `dumgen/openai-fetch` | operational | Perform a no-network unstructured Responses operation. | 1.203 | 1.859 | none |
| `dumgen/runtime` | operational | Build Dumgen runtime with injected no-network dependencies. | 4.594 | 4.813 | none |
| `dumgen/runtime-prompt-data` | operational | Read the generated compressed prompt payload for sidecar-free runtime bundlers. | 0.766 | 0.938 | none |
| `dumgen/vocabulary` | operational | Read and verify the public Dumgen runtime vocabulary. | 0.844 | 0.906 | none |
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
