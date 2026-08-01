# `dumgen` laboratory

Early-WIP generation helpers for hands-on prompt experiments. Nothing in this
package is production-ready.

## Core idea

`dumgen` exposes a typed laboratory catalog of executable generators:

- the OpenAI Responses API
- automatic prompt caching for repeated prompt prefixes
- Zod-backed input and output validation
- inferred input and output types at every generator leaf

Example usage:

<!-- README_BLOCK:basic-usage -->

## Vision

The current German-only laboratory path uses progressively narrower generators
to inspect the clickable-word dictionary chain:

1. Segment accepted German text.
2. Classify the clicked Segment through `Selection → Surface → Lemma → Reading`.
3. Validate the assembled grammatical entities with Dumling's German schemas.

The prompts live only under `laboratory`. The application orchestrates the
stages; there is deliberately no production namespace or production claim.

See [persistent prompt-chain decisions](./docs/persistent/prompt-chains.md) for
the agreed chain topology and the distinction between runtime stages and test
infrastructure.

## Scope

- Runtime: `Node >= 24`
- Package format: ESM
- Tooling: Bun, TypeScript, Biome

Set `OPENAI_API_KEY` in the server environment. Never expose it to browser
code or commit it to source control.
