# `dumgen`

Typed, language-routed learner-text resolution. The Section 1 German/Hebrew
segmentation path and combined German Knowledge generation have public
interfaces; the remaining post-click prompt routes are incremental.

## Core idea

`dumgen` exposes a typed, language-routed module for sentence segmentation,
click resolution, and German Reading enrichment:

- the OpenAI Responses API
- automatic prompt caching for repeated prompt prefixes
- Zod-backed input and output validation
- validated Dumgen and Dumling domain results

The `dumgen` root and operational subpaths do not export Zod schemas.
Schema-authoring and model-integration callers may explicitly import the broad
DTO schemas from `dumgen/schema`; application validation should use Dumgen's
lightweight parser interfaces instead.

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
5. Generate one sparse Knowledge update for an exact German Reading and the
   current marked context. The result contains atomic Dumrel changes and
   pending relation Unit Shadows. An empty request returns an empty update
   without a model call.
6. Validate projected grammatical and Knowledge results with concrete Dumling
   and Dumrel schemas.

The prompt catalog and language-specific segmenters remain internal; consumers
do not coordinate prompt leaves or depend on their topology. Section 1 failures
are returned as typed results. Programming defects in later operations still
throw.

Prompt Sources live under
`src/promptsmith/production` in stage-first routes. Each leaf owns
its combined model schemas, instructions, and validated demonstrations. Routes
with canonical semantic cases also own a route-local Golden Corpus.
`bun run generate:system-prompts` deterministically rebuilds the committed
system-prompt modules; `bun run check:system-prompts` checks them without
modifying the workspace.

See the [Dumgen documentation index](./docs/persistent/README.md) for the
current prompt-chain contract and the durable authoring rules behind it.

## Scope

- Runtime: `Node >= 24`
- Package format: ESM
- Tooling: Bun, TypeScript, Biome

Set `OPENAI_API_KEY` in the server environment. Never expose it to browser
code or commit it to source control.
