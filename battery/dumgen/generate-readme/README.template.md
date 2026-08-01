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

The current German-only laboratory path uses pointed generators for each
settled stage:

1. Run language-agnostic Intake, then `Segmentation<de>`.
2. Classify one click with `Target Classification<de, HighLevelWholeUnit>`.
3. Dispatch through physically distinct grammatical and Reading routes for the
   target's German Lemma Family and Kind.
4. Validate projected grammatical results with Dumling's concrete schemas.

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
