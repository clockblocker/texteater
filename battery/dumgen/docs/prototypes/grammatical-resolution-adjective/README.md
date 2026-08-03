# German Lexeme/ADJ Grammatical Resolution evaluation

This route-local prototype evaluates the exact
`grammatical-resolution/de/lexeme/adjective` Prompt Source. Its Golden Corpus
has 26 explicit cases: two DTO-shape demonstrations, 17 disjoint authoritative
held-out cases, and seven corpus-only cases. Four of the corpus-only cases are
Core Feature policy probes; the other three retain semantically parallel
adverbial, typo, and perfect-participle stimuli outside the prompt. Resolved
demonstration Lemmas never occur in held-out scoring, and explicit
contamination keys prevent those parallel stimuli from crossing the
demonstration/evaluation boundary.

The held-out suite covers attributive agreement across all four cases, all
three genders, singular and plural; predicative and adverbial positive forms;
regular and irregular comparison, including `besser` → `gut`; ordinal
`NumType`; typo repair; a representable agreement-bearing adjective formed
from a participle; lexical-ADV and perfect-participle wrong-route decisions;
overbroad scope; repeated Surface occurrences; and unrelated targets. The only
demonstrations establish the exact Citation and Inflection DTO branches.

The DTOs are derived directly from Dumling's German Lexeme/ADJ schemas and omit
only model-redundant discriminants and links: Lemma `language`, `family`, and
`kind`, plus Surface `language` and `lemma`. The model still returns every
nullable Core and Inflectional Feature. Null-only Surface Features are accepted
as Structured Outputs-compatible spelling and canonicalized to null only by
the exact diagnostic evaluator.

Primary references:

- [IDS grammis: Adjektiv](https://grammis.ids-mannheim.de/terminologie/6)
  distinguishes attributive agreement from uninflected predicative and
  adverbial use.
- [IDS grammis: Flexion der Adjektive](https://grammis.ids-mannheim.de/kontrastive-grammatik/3609)
  treats comparison and attributive declension as independent dimensions.
- [Universal Dependencies: German](https://universaldependencies.org/de/)
  defines `Degree=Pos|Cmp|Sup` for German ADJ.
- [UD German-GSD ADJ statistics](https://universaldependencies.org/treebanks/de_gsd/de_gsd-pos-ADJ.html)
  provide the attested feature inventory, comparison paradigms such as
  `gut`/`besser`/`beste`, participial ADJ evidence, and adverbial dependencies.
- [UD German Variant](https://universaldependencies.org/de/feat/Variant.html)
  documents `Variant=Short` for suffixless predicative/adverbial adjective
  tokens in some German treebanks.

## Corpus-only policy probes

- `Variant=Short`: UD defines it on contextual tokens, while Dumling currently
  places `variant` in Lemma Core Features. Confirm whether it should be emitted,
  moved, or deliberately collapsed to null.
- `NumType=Card`: confirm the ADJ/NUM route boundary for indeclinable cardinal
  modifiers such as `siebenhundert`.
- `Foreign=Yes`: define when a borrowed adjective such as `cool` is established
  enough to lose the foreign feature.
- `Abbr=Yes`: define punctuation, canonical form, and recoverable agreement for
  abbreviated adjectives such as `sog.`.

These questions are not demonstrations or authoritative scores; persistent
logbook registration is owned by root integration.

## Bounded evidence runner

The runner makes exactly one serial call for each of the 17 held-out cases with
the route-local `gpt-5-nano` policy, high reasoning, a 16,384-token output
budget, zero retries, and `store: false`. Transport errors remain error-only
attempts; when JSON or exact-schema parsing fails after a provider response,
the runner retains raw output text plus complete response ID, resolved model,
and usage metadata with the error. No live call was made while authoring this
slice.

Shared registration and package wiring live outside this route-local prototype.
A later explicit live run can invoke:

```sh
bun --env-file ../../.env.local \
  docs/prototypes/grammatical-resolution-adjective/run.ts
```

Draft results are written atomically below `runs/<timestamp>/results.json` and
cannot meet the evidence threshold until offline human classification. Provider
errors require a fresh bounded run.

Create a JSON sidecar keyed by every failed case, using `prompt-defect`,
`corpus-or-evaluator-defect`, or `accepted-model-limitation`, each with a
non-empty explanation. Then finalize offline:

```sh
bun docs/prototypes/grammatical-resolution-adjective/run.ts finalize \
  docs/prototypes/grammatical-resolution-adjective/runs/<timestamp>/results.json \
  docs/prototypes/grammatical-resolution-adjective/runs/<timestamp>/miss-classifications.json
```

Finalization rejects obsolete prompt, suite, Golden Case, schema, model, token
budget, or runner bindings; recomputes diagnostics and score; rejects provider
errors; requires every scored miss to be classified; and atomically replaces
the retained JSON. Evidence qualifies at 15 calls, at least 80% exact-contract
score, zero execution errors, and zero unclassified misses.
