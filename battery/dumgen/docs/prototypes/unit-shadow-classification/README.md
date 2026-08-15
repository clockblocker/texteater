# Unit Shadow Family and Kind classification gate

This bounded live evaluation answers issue #118's decision question: can one
shallow Dumgen operation classify required `Family + Kind` for proposed Unit
Shadows without performing Lemma, Core Feature, Reading, or Knowledge
resolution?

The Prompt Source owns one canonical corpus. Twelve examples are prompt
demonstrations. The pinned 48-case evaluation is disjoint and contains
cases spanning all three Dumling languages, all supported Lexeme parts of
speech, every Family, homographic Kinds, phraseme/morpheme/construction
boundaries, the paired `erwägen` Lexeme and `in Betracht ziehen` Phraseme
synonyms, wrong-Family traps, and explicit abstentions. The exact evaluator
requires decision, Family, and Kind all to match. The acceptance threshold is
therefore `1.0`: one miss fails the gate.

The runner uses the shared direct Responses evaluation harness with the Dumgen
model policy, no retries, `store: false`, an explicit cache breakpoint after
the stable system prompt, and a hard maximum of fifty calls. Retained results
bind the exact prompt, schemas, ordered corpus, model, and execution policy.

From `battery/dumgen`, preflight without a provider call:

```sh
bun run prototype:unit-shadow-classification preflight development 1
```

Run the bounded suite:

```sh
bun run prototype:unit-shadow-classification run development 1
```

Every run is draft evidence until offline finalization. For a perfect run, use
an empty JSON object as its miss-classification sidecar and finalize it:

```sh
bun run docs/prototypes/unit-shadow-classification/run.ts finalize \
  docs/prototypes/unit-shadow-classification/runs/<timestamp>/results.json \
  docs/prototypes/unit-shadow-classification/runs/<timestamp>/miss-classifications.json
```

The required decision is conservative: retain mandatory `Family + Kind` only
when finalized current evidence reports a perfect score with no execution
errors. Any miss keeps the issue gate closed until the prompt/contract is
revised and fresh evidence is retained.
