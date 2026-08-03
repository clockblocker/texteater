# German Lexeme/CCONJ Grammatical Resolution evaluation

This route-local evaluation follows the Lexeme/NOUN reference protocol without
adding catalog or runtime wiring. Its Golden Corpus contains 27 cases covering
the Citation-only Surface contract, ordinary and comparative conjunctions,
nullable `conjType`, typo repair, licensed abbreviation, contextual casing,
archaic Surface status, ambiguous forms, repeated tokens, overbroad targets,
multiple targets, and wrong-route uses. Five cases are necessary policy
demonstrations and 18 explicitly pinned cases form the disjoint evaluation
suite. Same-lexeme paraphrases of demonstrated comparative `als` and ambiguous
`doch` are deliberately excluded from scoring; the suite instead retains a
clean positive coordinating `doch`. The archaic `allein` case remains
corpus-only pending human confirmation, and the context-sensitive `jedoch`
boundary is also corpus-only.

The bounded live runner makes one serial call per evaluation case with
`gpt-5.6-luna`, no reasoning effort, no retries, `store: false`, and a
1,024-token output cap. Before creating a provider client, it requires 15–25
cases and schema-parses every selected input and ideal output. It records the
ordered case IDs, assembled-prompt SHA-256, pinned model and generation policy,
timestamps, outputs, field diagnostics, response metadata, and errors.

An attempt passes only when its schema-parsed output has the same canonical
semantic model fields as the pinned ideal output. The evaluator treats an
all-null model `surfaceFeatures` bag like `null`, matching the route-local
codec, while keeping every other field exact. Live results are draft evidence
until offline finalization. Final evidence requires at least 15 attempted
cases, an 80% score, no execution/provider errors, and an explicit human
classification for every scored miss.

Prompt code generation and the prototype command are registered, while shared
catalog/runtime wiring remains deferred. To run deliberately from
`battery/dumgen`:

```sh
bun run prototype:grammatical-resolution-coordinating-conjunction
```

The runner atomically retains draft results under `runs/<timestamp>/results.json`
and exits unsuccessfully so that finalization remains an explicit review gate.
Provider errors always require a fresh run.

## Classifying misses

Create a JSON sidecar beside the draft result, keyed by every failed case ID:

```json
{
  "grammar-de-cconj-example": {
    "classification": "prompt-defect",
    "explanation": "The prompt does not state the applicable boundary."
  }
}
```

The classification must be `prompt-defect`,
`corpus-or-evaluator-defect`, or `accepted-model-limitation`; every explanation
must be non-empty. Finalize without another provider call:

```sh
bun run docs/prototypes/grammatical-resolution-coordinating-conjunction/run.ts \
  finalize \
  docs/prototypes/grammatical-resolution-coordinating-conjunction/runs/<timestamp>/results.json \
  docs/prototypes/grammatical-resolution-coordinating-conjunction/runs/<timestamp>/miss-classifications.json
```

Finalization strictly validates the retained v2 artifact, recomputes every
diagnostic and summary, and atomically replaces the result. Retained summary
fields must also agree with their attempts and draft/finalized state. It rejects stale
case selections, Golden Cases, prompts, generation policy, missing or spurious
classifications, and any run containing provider or execution errors.

## Linguistic basis and open boundary

The ordinary CCONJ inventory and ambiguity cases follow the
[UD German GSD CCONJ statistics](https://universaldependencies.org/treebanks/de_gsd/de_gsd-pos-CCONJ.html)
and the coordination examples in the
[UD German `conj` documentation](https://universaldependencies.org/de/dep/conj.html).
The exceptional `conjType: "Comp"` cases follow the
[UD `ConjType=Comp` definition](https://universaldependencies.org/u/feat/ConjType.html).

The adversative use of `allein` is deliberately not scored: whether this
attestation crosses Dumling's `historicalStatus: "Archaic"` boundary is a real
policy decision, not a model failure. The corpus retains the case so a reviewer
can settle it without silently losing coverage.
