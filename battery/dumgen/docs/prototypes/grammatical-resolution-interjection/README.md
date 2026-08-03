# German Lexeme/INTJ Grammatical Resolution evaluation

This route-local experiment evaluates
`grammatical-resolution/de/lexeme/interjection` without catalog or runtime
wiring. The Golden Corpus contains 24 cases across expressive and response
interjections, Citation Surface behavior, orthography and normalization, and
Unresolved route boundaries. Five cases are policy demonstrations and 18
explicit cases form the disjoint held-out evaluation suite. The `juchhei`
historical-status case remains corpus-only: the attested `veraltend` label does
not automatically settle the schema's stronger `Archaic` taxonomy.

The generated prompt is registered with shared Prompt Assembly codegen, and the
package exposes a convenience prototype command. Catalog and runtime wiring
remain deferred.

The demonstrations are intentionally limited to five non-redundant rules:

- `pfui` establishes an ordinary expressive INTJ with null `partType` and a
  Citation Surface even in running context;
- answer `ja` establishes the narrow response value `partType: "Res"`;
- `hmm` distinguishes licensed expressive lengthening from a Typo or Partial
  realization;
- the marked `o` in `o wei` preserves the larger Phraseme route; and
- `pfui!` rejects punctuation included inside a lexical TARGET.

The bounded runner pins `gpt-5.6-luna`, no reasoning effort, low text verbosity,
no retries, `store: false`, a 1,024-token output cap, and one serial call per
case. Before constructing a provider client it parses the exact 18-case suite,
enforces the 15–25 case bound, and requires an API key. Importing the runner,
preflighting, parsing retained evidence, and finalizing evidence make no model
calls.

Every draft records the exact ordered case IDs, assembled prompt hash, model
policy, timestamps, outputs, field diagnostics, response metadata, and errors.
The runner atomically writes the draft and deliberately exits unsuccessfully:
offline human classification is required before evidence can qualify. A
finalized run reaches the review threshold only when it has at least 15 cases,
an exact contract score of at least 80%, no execution/provider errors, and an
explicit classification for every miss.

No live evaluation was run while authoring this slice. To make a bounded draft
later, run from `battery/dumgen`:

```sh
bun run prototype:grammatical-resolution-interjection
```

Results are retained under `runs/<timestamp>/results.json`. For every failed
case, create a sidecar next to it:

```json
{
  "grammar-de-intj-example": {
    "classification": "prompt-defect",
    "explanation": "The prompt does not state the applicable boundary."
  }
}
```

The classification must be `prompt-defect`,
`corpus-or-evaluator-defect`, or `accepted-model-limitation`. Finalize without
a provider call:

```sh
bun run docs/prototypes/grammatical-resolution-interjection/run.ts finalize \
  docs/prototypes/grammatical-resolution-interjection/runs/<timestamp>/results.json \
  docs/prototypes/grammatical-resolution-interjection/runs/<timestamp>/miss-classifications.json
```

Finalization validates the full artifact, recomputes every field diagnostic and
summary, requires exact current Golden Case inputs and ideals, rejects stale
prompt or runner policy, rejects provider errors, and atomically replaces the
draft only after all misses are classified.
