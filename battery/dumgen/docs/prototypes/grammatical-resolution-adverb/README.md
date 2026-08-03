# German Lexeme/ADV Grammatical Resolution evaluation

This route-local prototype evaluates the exact
`grammatical-resolution/de/lexeme/adverb` Prompt Source. Its Golden Corpus has
32 cases spanning uninflected Citation Surfaces, degree-marked Inflection
Surfaces, all modeled German ADV Core Features, orthography, normalization, and
route boundaries. Nine cases are demonstrations and 15 settled cases form the
disjoint authoritative held-out suite. Eight policy probes remain corpus-only:
historical status for `allhier`, `Foreign=Yes` for lexicalized `circa`,
unsupported ordinal `erstens`, colloquial split `da … für`, `Card`/`Ind` on
quantitative `viel`, the single-Lemma ambiguity of `am häufigsten`, lexical
`PronType=Int` versus relative use for `wo`, and the ADV/PART plus
`PronType=Ind` tension for degree-modifier `etwas`. Resolved demonstration
Lemmas do not occur in held-out scoring.

The corpus-only `am häufigsten` case remains intentionally Unresolved: the same
marked superlative can realize regular `häufig` or the suppletive paradigm of
`oft`, and its context does not establish one Lemma identity. The `wo` and
`etwas` cases likewise retain their exact inputs and oracles as policy probes;
none of the three is an authoritative score, evaluator tolerance, or promoted
demonstration.

The demonstrations establish the schema-sensitive boundaries: ordinary
ungraded ADV uses are Citation because Dumling requires a non-null Degree on an
Inflection Surface; dictionary labels are also Citation; pronominal `dazu`
establishes a non-null `PronType=Dem` Core Feature without sharing a Lemma with
held-out `damit`; quantitative `genug` establishes GSD-attested
`PronType=Ind` without sharing corpus-only `etwas`; and negative `nie`
establishes `PronType=Neg` without sharing held-out `keineswegs`. German GSD's
only negative ADV lemma is `keineswegs`, so the `nie` annotation is sourced
from the official German-LIT treebank and applies the German UD
negative-proform policy without claiming a GSD attestation. Irregular
comparative and periphrastic superlative forms are Inflection; TARGET pairs
determine member count; actual misspellings are repaired and marked Typo; and
productive adverbial use of an adjective stays on Lexeme/ADJ.

The prompt also makes the reviewed generic decisions explicit: verb-second
matrix uses distinguish pronominal adverbs from homographic verb-final
subordinators; applicable PronType and NumType values are mandatory rather than
optional just because their fields are nullable; `Mult` marks occurrence-count
and `-mal` adverbs while `Card` marks cardinal quantity; and literal TARGET
counts do not license an overbroad modifier-plus-head span.

The bounded runner makes one serial call per held-out case with the shared
`gpt-5.6-luna` model, no reasoning, a 4,096-token output budget, no
retries, and `store: false`. Higher reasoning did not improve the authoritative
outcomes, while independent review identified three recurring failures as
unsettled corpus policy rather than honest scoreable contracts. The exact
15-case suite remains at the acceptance minimum and preserves the settled Core
Feature, degree, normalization, route, and target-scope coverage. Integration
ticket #54 must configure ADV with the same `gpt-5.6-luna` and no-reasoning
policy. The runner preflights exactly 15 cases against the authored Prompt
Source schemas before creating a provider client.
Retained evidence binds the exact ordered suite, Golden Case values, assembled
prompt hash, authored input/output schema hashes, literal retained `model`,
catalog output-token policy, runner version, response metadata, field-level
diagnostics, and errors. Imports, tests, validation, and finalization make no
provider calls.

## Suggested prompt-logbook wording

- `wo`: German GSD keeps ADV lemma `wo` lexically `PronType=Int`, including in
  relative-clause attestations, but Dumgen still needs a policy ruling on
  whether lexical Core Feature identity or the contextual relative use governs
  this route's learner-facing resolution. Keep the exact case corpus-only until
  that boundary is settled.
- `etwas`: Degree-modifier `etwas` is attested as ADV with `PronType=Ind`, but
  its ADV/PART route boundary and the requirement to preserve that lexical Core
  Feature remain a combined policy tension. Keep the exact case corpus-only
  rather than treating either analysis as authoritative evidence.

Root integration must register the Prompt Source and package script. A live run
is then an explicit manual action from `battery/dumgen`:

```sh
bun run prototype:grammatical-resolution-adverb
```

Draft results are written atomically below `runs/<timestamp>/results.json`.
The live command exits unsuccessfully after retaining the draft because human
miss classification is a required gate. Provider errors require a fresh run.

## Evidence finalization

Create a JSON sidecar keyed by every failed case, using one of
`prompt-defect`, `corpus-or-evaluator-defect`, or
`accepted-model-limitation`, with a non-empty explanation. Finalize offline:

```sh
bun run docs/prototypes/grammatical-resolution-adverb/run.ts finalize \
  docs/prototypes/grammatical-resolution-adverb/runs/<timestamp>/results.json \
  docs/prototypes/grammatical-resolution-adverb/runs/<timestamp>/miss-classifications.json
```

Finalization rejects obsolete prompt, catalog, suite, Golden Case, schema, or
runner bindings; recomputes every diagnostic and score; rejects provider
errors; and requires every miss to be classified. Evidence qualifies with at
least 15 calls, at least 80% exact-contract score, zero execution errors, and
zero unclassified misses.
