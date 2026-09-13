# Dum operational-entrypoint RSS baseline

Captured 2026-09-08T10:46:56.729Z from `78dc9762d8aa254b34e7f3fba797d1aa530273ad` with Bun 1.3.14 on darwin/arm64.

Contract: five fresh Bun processes per measurement; median max RSS delta over an empty imported module. Strict surfaces must keep import-only below 5 MiB and import-plus-operation at or below 5.3 MiB. Effect workflows are measured and reported without an RSS cap. Raw byte samples are retained in the adjacent JSON artifact.

Empty-module samples: `31211520`, `31227904`, `31162368`, `31195136`, `31145984` bytes; median `31195136` bytes.

## Canonical matrix

| Entrypoint | Classification | Representative operation | Import delta (MiB) | Import + operation delta (MiB) | Reachable schema/heavy dependencies |
| --- | --- | --- | ---: | ---: | --- |
| `dumling` | operational | Parse a valid German NOUN Lemma through the language API. | 3.672 | 4.203 | none |
| `dumling-old/types` | type-only | Published JavaScript is empty; the subpath is a type surface. | — | — | — |
| `dumling-old/schema` | schema-authoring-exempt | Deliberately Zod-bearing public schema composition surface. | — | — | — |
| `dumling-old/dangerously-heavy-schema-tree` | schema-authoring-exempt | Deliberately dangerous route-specific schema tree costing roughly 100 MiB RSS. | — | — | — |
| `dumling-old/id` | operational | Encode and decode a canonical Lemma ID through the lean codec facade. | 2.031 | 3.219 | none |
| `dumling-old/reading` | operational | Compute the stable fingerprint of a Reading. | 1.031 | 1.422 | none |
| `dumling-old/vocabulary` | operational | Read and verify the public Dumling runtime vocabulary. | 0.953 | 0.969 | none |
| `dumling-old/fixed` | operational | Read and verify the fixed German determiner catalog. | 1.922 | 1.875 | none |
| `dumling-old/package.json` | metadata | Package metadata, not executable application code. | — | — | — |
| `dumrel` | operational | Apply a normalized Definition Knowledge Change. | 3.891 | 4.891 | none |
| `dumrel/types` | type-only | Published JavaScript is empty; the subpath is a type surface. | — | — | — |
| `dumrel/relations` | operational | Project a minimal direct Semantic Relation graph. | 1.594 | 1.875 | none |
| `dumrel/grammatical-relations` | operational | Project an empty Grammatical Relation claim set. | 1.203 | 1.266 | none |
| `dumrel/schema` | schema-authoring-exempt | Deliberately Zod-bearing public schema composition surface. | — | — | — |
| `dumrel/settings` | operational | Read and verify the frozen default Knowledge Settings. | 1.047 | 1.063 | none |
| `dumrel/vocabulary` | operational | Read and verify the public relation vocabulary. | 0.922 | 1.031 | none |
| `dumrel/fixed` | operational | Resolve fixed Knowledge for a catalogued German determiner Reading. | 3.438 | 3.781 | none |
| `dumrel/package.json` | metadata | Package metadata, not executable application code. | — | — | — |
| `dumdict` | operational | Apply a Definition Knowledge Change to a Reading Entry. | 35.953 | 36.953 | none |
| `dumdict/schema` | schema-authoring-exempt | Deliberately Zod-bearing public schema composition surface. | — | — | — |
| `dumdict/dangerously-heavy-schema-tree` | schema-authoring-exempt | Deliberately dangerous language-specific schema tree costing roughly 100 MiB RSS. | — | — | — |
| `dumdict/runtime` | operational | Apply a Definition Knowledge Change to a Reading Entry. | 35.469 | 36.063 | none |
| `dumdict/relations` | operational | Project an empty learner Semantic Relation inventory. | 1.641 | 1.859 | none |
| `dumdict/pending` | operational | Construct canonical Pending Semantic Relation identity. | 1.125 | 1.594 | none |
| `dumdict/package.json` | metadata | Package metadata, not executable application code. | — | — | — |
| `dumgen` | operational | Build Dumgen with an injected no-network model SDK. | 36.172 | 36.938 | none |
| `dumgen/projection` | operational | Project a grammatical target from Segments. | 1.094 | 1.172 | none |
| `dumgen/schema` | schema-authoring-exempt | Deliberately Zod-bearing public model and DTO schema composition surface. | — | — | — |
| `dumgen/model-authoring` | schema-authoring-exempt | Deliberately Zod-bearing prompt and structured-output authoring surface. | — | — | — |
| `dumgen/knowledge` | operational | Build Knowledge generation with an injected no-network SDK. | 35.031 | 33.359 | none |
| `dumgen/knowledge-runtime` | operational | Build Knowledge generation with an injected no-network SDK. | 35.266 | 37.109 | none |
| `dumgen/openai-fetch` | operational | Perform a no-network unstructured Responses operation. | 32.000 | 34.141 | none |
| `dumgen/runtime` | operational | Build Dumgen runtime with injected no-network dependencies. | 37.375 | 36.656 | none |
| `dumgen/runtime-prompt-data` | operational | Read the generated compressed prompt payload for sidecar-free runtime bundlers. | 0.844 | 1.063 | none |
| `dumgen/vocabulary` | operational | Read and verify the public Dumgen runtime vocabulary. | 0.969 | 1.031 | none |
| `dumgen/package.json` | metadata | Package metadata, not executable application code. | — | — | — |

## Interpretation

The user-approved 5.3 MiB operation ceiling is one global allowance for observed five-process median measurement noise around 5 MiB, not a per-package waiver. It applies only to strict surfaces. Effect workflow RSS is retained as an observation because its runtime cost is no longer a proxy for schema loading. Heavyweight and schema reachability remain a zero-tolerance rule for every operational surface.

The explicit schema/model-authoring escape hatches are `dumling-old/schema`, `dumling-old/dangerously-heavy-schema-tree`, `dumrel/schema`, `dumdict/schema`, `dumdict/dangerously-heavy-schema-tree`, `dumgen/schema`, `dumgen/model-authoring`. They are exempt from the operational budget; any schema reachability from an operational package root remains a violation rather than gaining an exemption.

A vocabulary or settings subpath is operational runtime data, so it is measured. Type-only JavaScript and `package.json` metadata are inventoried for exhaustiveness but not benchmarked.

Reachability is derived from the built public JavaScript graph. `zod` and `codec-builder-library` identify schema/runtime weight; `openai` identifies the provider SDK loaded by a convenience entrypoint. An explicit `/schema` dependency reachable from an operational entrypoint is always reported even when Zod is also visible directly.

## Reproduce

```sh
bun run benchmark:dum-entrypoints
bun run benchmark:dum-entrypoints --write
```

The first command rebuilds the four packages and prints the report. `--write` also replaces this Markdown file and its JSON companion.
