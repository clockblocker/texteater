# `dumgen`

Typed, language-routed learner-text resolution. The Section 1 German/Hebrew
segmentation path is production-ready; post-click prompt routes remain
incremental laboratory-backed features.

## Core idea

`dumgen` exposes a typed, language-routed module for sentence segmentation and
click resolution:

- the OpenAI Responses API
- automatic prompt caching for repeated prompt prefixes
- Zod-backed input and output validation
- validated Dumgen and Dumling domain results

Example usage:

<!-- README_BLOCK:basic-usage -->

## Segmentation chain

The module owns each stage behind one batch-only operation:

1. Make one bounded Intake model call for an ordered list of caller-delimited
   Source Sentences. Intake minimally repairs whitespace and returns one
   position-preserving decision per item.
2. Dispatch accepted items to deterministic, zero-package German or Hebrew
   Source Segmentation. There is no second segmentation model call.
3. For German, classify one click with
   `Target Classification<de, HighLevelWholeUnit>` and dispatch through
   grammatical routes for the target's German Lemma Family and Kind. Fixed
   realized governed prepositions, inherent reflexives, separable members, and
   perfect/future/passive auxiliaries remain positionally aligned through the
   target, Attestation, and normalized Surface.
4. Resolve the selected Lemma against learner Reading candidates through the
   language-routed Reading operation.
5. Validate projected grammatical results with Dumling's concrete schemas.

The prompt catalog and language-specific segmenters remain internal; consumers
do not coordinate prompt leaves or depend on their topology. Section 1 failures
are returned as typed results. Programming defects in later operations still
throw.

Prompt Sources live under
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
