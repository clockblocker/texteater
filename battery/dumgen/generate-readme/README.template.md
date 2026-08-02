# `dumgen` laboratory

Early-WIP generation helpers for hands-on prompt experiments. Nothing in this
package is production-ready.

## Core idea

`dumgen` exposes a typed, language-routed module for sentence segmentation and
click resolution:

- the OpenAI Responses API
- automatic prompt caching for repeated prompt prefixes
- Zod-backed input and output validation
- validated Dumgen and Dumling domain results

Example usage:

<!-- README_BLOCK:basic-usage -->

## Vision

The current German-only module owns each settled chain:

1. Make a language-agnostic Intake model call. If it returns `Accepted`, make a
   second model call to `Segmentation<de>`; the two stages are never combined.
2. Classify one click with `Target Classification<de, HighLevelWholeUnit>`.
3. Dispatch internally through physically distinct grammatical routes for the
   target's German Lemma Family and Kind.
4. Resolve the selected Lemma against learner Reading candidates through the
   language-routed Reading operation.
5. Validate projected grammatical results with Dumling's concrete schemas.

The prompt catalog remains internal under `laboratory`; consumers do not
coordinate prompt leaves or depend on their topology. There is deliberately no
production namespace or production claim.

The initial five Prompt Sources live under
`src/promptsmith/laboratory/prompt-source` in stage-first routes. Each leaf owns
its combined model schemas, instructions, and validated demonstrations. Routes
with canonical semantic cases additionally own a route-local Golden Corpus.
`bun run generate:system-prompts` deterministically rebuilds the committed
system-prompt modules; `bun run check:system-prompts` checks them without
modifying the workspace.

See [persistent prompt-chain decisions](./docs/persistent/prompt-chains.md) for
the agreed chain topology and the distinction between runtime stages and test
infrastructure.

## Scope

- Runtime: `Node >= 24`
- Package format: ESM
- Tooling: Bun, TypeScript, Biome

Set `OPENAI_API_KEY` in the server environment. Never expose it to browser
code or commit it to source control.
