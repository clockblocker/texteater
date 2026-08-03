# German Lexeme/PROPN Grammatical Resolution evaluation

This route-local prototype evaluates the exact
`grammatical-resolution/de/lexeme/proper-noun` Prompt Source. Its Golden Corpus
has 30 explicit cases: four demonstrations, 18 disjoint authoritative held-out
cases, and eight corpus-only cases. Demonstration selection is external to
stable case IDs; no case ID encodes `demo` or another selection role.

The route resolves one complete word-like PROPN token, not a whole named
entity. Its held-out suite covers nominative, accusative, dative, genitive, and
vocative-like use; singular and lexical plural; explicit Citation; contextual
Inflection; genitive `-s` and apostrophe preservation on Surface with Lemma
recovery; typo repair; established acronym identity without shape-only feature
inference; wrong-route inputs; repeated and unrelated targets. Multi-token and overbroad
name stimuli share contamination keys and remain outside scoring when they are
semantically parallel to the demonstration. The authoritative controls also
cover a lexical plural-only name without Gender and an established abbreviated,
feminine organization name whose foreign origin is not itself Foreign.

The DTOs are derived from Dumling's German Lexeme/PROPN schemas. The route-local
codec fixes Lemma `language`, `family`, and `kind`, plus Surface `language` and
the Lemma link, so the model never repeats them. The model still returns all
nullable `abbr`, `foreign`, and `gender` Core Features and the non-empty
Inflectional `case`/`number` bag. Null-only Surface Features are accepted in the
Structured Outputs shape and canonicalized to null by the exact evaluator.

Primary references:

- [Universal Dependencies: PROPN](https://universaldependencies.org/u/pos/PROPN.html)
  defines a proper noun as the name of a specific individual, place, or object
  and assigns PROPN to each word of a multiword name.
- [UD German-GSD PROPN statistics](https://universaldependencies.org/treebanks/de_gsd/de_gsd-pos-PROPN.html)
  provide the attested German Case, Number, Gender, Abbr, Foreign, and NumType
  inventory used to scope the corpus.
- [IDS grammis: Genitiv bei Eigennamen](https://grammis.ids-mannheim.de/systematische-grammatik/379)
  documents written German proper-name genitives, including `-s` and the
  apostrophe after names ending in an s-sound.
- [Duden: NATO](https://www.duden.de/rechtschreibung/NATO) records the
  established German short name as feminine.
- [Duden: Niederlande](https://www.duden.de/rechtschreibung/Niederlande)
  records the place name as plural-only.

## Corpus-only policy probes

- Numeric name components such as `II`: German GSD can route them to PROPN with
  `NumType`, which the current German PROPN codec cannot represent.
- Organization Gender and acronym `Abbr`: neither is inferred from token shape
  alone. Reliable lexical evidence can establish both; the scored `NATO`
  control therefore uses `abbr: "Yes"` and `gender: "Fem"`, while the less
  settled `SPD` case remains corpus-only.
- `Foreign=Yes`: treebank annotation is token-local, while Dumling Core Features
  make it stable Lemma identity. An established German loan or name is not
  Foreign merely because it has a foreign origin.
- Abbreviated names such as `Chr.`: punctuation, canonical expansion, and
  `Abbr=Yes` need an explicit route policy.
- Stylized brands and productive pluralized surnames: casing and route ownership
  remain policy questions, not authoritative scoring decisions.

These probes are neither demonstrations nor authoritative scores. Persistent
logbook registration is owned by root integration.

## Bounded evidence runner

The runner makes exactly one serial call for each of the 18 held-out cases with
the shared `gpt-5.6-luna` policy, no reasoning, a 16,384-token output
budget, zero retries, and `store: false`. Transport errors remain error-only
attempts; when JSON or exact-schema parsing fails after a provider response,
the runner retains raw output text plus complete response ID, resolved model,
and usage metadata with the error. This correction made no additional live
call. Retained evidence from before the corrected prompt and NATO Golden Case is
intentionally obsolete and finalization rejects its old binding.

Shared generator registration, package wiring, and runtime catalog registration
are deliberately outside this route-local slice. After root integration, a
later explicit live run can invoke:

```sh
bun --env-file ../../.env.local \
  docs/prototypes/grammatical-resolution-proper-noun/run.ts
```

Draft results are written atomically below `runs/<timestamp>/results.json` and
cannot meet the evidence threshold until offline human classification. Provider
errors require a fresh bounded run.

Create a JSON sidecar keyed by every failed case, using `prompt-defect`,
`corpus-or-evaluator-defect`, or `accepted-model-limitation`, each with a
non-empty explanation. Then finalize offline:

```sh
bun docs/prototypes/grammatical-resolution-proper-noun/run.ts finalize \
  docs/prototypes/grammatical-resolution-proper-noun/runs/<timestamp>/results.json \
  docs/prototypes/grammatical-resolution-proper-noun/runs/<timestamp>/miss-classifications.json
```

Finalization rejects obsolete prompt, suite, Golden Case, schema, model, token
budget, or runner bindings; recomputes diagnostics and score; rejects provider
errors; requires every scored miss to be classified; and atomically replaces
the retained JSON. Evidence qualifies at 15 calls, at least 80% exact-contract
score, zero execution errors, and zero unclassified misses.
