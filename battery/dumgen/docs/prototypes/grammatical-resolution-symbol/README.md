# German Lexeme/SYM Grammatical Resolution evaluation

This route-local vertical slice evaluates the exact
`grammatical-resolution/de/lexeme/symbol` Prompt Source. Its Golden Corpus has
29 cases: four necessary demonstrations, 18 authoritative disjoint held-out
cases, and seven corpus-only policy or boundary probes. The held-out suite covers
mathematical operators, unit and currency signs, technical marks, emoticons,
emoji, invariant Citation Surfaces, explicitly nominal Inflection Surfaces, and
SYM boundaries with PUNCT, NUM, NOUN, PROPN, CCONJ, overbroad targets, and
multiple occurrences. No resolved demonstration Lemma appears in held-out
scoring.

## Annotation and DTO policy

The policy follows the Universal Dependencies SYM distinction and the German
GSD evidence. GSD has 101 SYM tokens and 19 types; its frequent examples include
`&`, `=`, `/`, `×`, `%`, `+`, `°`, `*`, `:-)`, and `€`. Ninety tokens have no
features. Ten carry case, gender, and number, establishing that an unchanged
symbol can have an Inflection Surface when contextual nominal agreement is
explicit. One ampersand carries `Foreign=Yes`; no German GSD SYM carries
`NumType`.

The authoritative Core is therefore `{foreign:null,numType:null}`. Foreign and
the codec-supported `NumType=Card|Range` remain corpus-only probes because the
available evidence does not establish stable symbol identities for them.
Ordinary symbols use Citation. Inflection requires explicit German nominal
agreement and at least one non-null case, gender, or number value. The provider
schema expresses that requirement as a structural union, matching Dumling's
non-empty refinement.

The four demonstrations have separate burdens: `%` shows the conservative
Citation shape, nominal `×` shows a supported non-all-null Inflection, comma
shows the PUNCT boundary, and a target spanning `5 %` shows the exact one-token
scope gate. Operators, currency, technical marks, emotive symbols, route
mirrors, and alternative nominal symbols stay held out. Route fingerprints,
granular contamination keys, and explicit selection keep demonstration inputs
and their sentence-punctuation semantic twins out of held-out scoring.

Primary references:

- [Universal Dependencies SYM](https://universaldependencies.org/u/pos/SYM.html)
- [German GSD SYM statistics](https://universaldependencies.org/treebanks/de_gsd/de_gsd-pos-SYM.html)
- [German GSD Case statistics](https://universaldependencies.org/treebanks/de_gsd/de_gsd-feat-Case.html)
- [German GSD Foreign statistics](https://universaldependencies.org/treebanks/de_gsd/de_gsd-feat-Foreign.html)

## Bounded evidence runner

The runner makes one serial call per held-out case with `gpt-5-nano`, high
reasoning effort, no retries, `store: false`, and a 16,384-token route-local
output cap. It preflights 15–25 cases before constructing a provider client.
Retained evidence binds the ordered Golden Cases, assembled prompt and schema
hashes, intended registration policy, model, reasoning policy, and runner
version. Provider output text and complete response metadata survive parse or
schema failures. Imports, tests, checks, and offline finalization make no model
calls.

Root integration will register the Prompt Source, generated prompt, and package
command. Catalog/runtime wiring belongs to the integration ticket. An explicit
live run from `battery/dumgen` can later use the package command or:

```sh
bun run docs/prototypes/grammatical-resolution-symbol/run.ts
```

The live command writes atomically beneath `runs/<timestamp>/results.json` and
exits unsuccessfully until every scored miss is classified offline. Provider
errors require a fresh bounded run. Finalize with:

```sh
bun run docs/prototypes/grammatical-resolution-symbol/run.ts finalize \
  docs/prototypes/grammatical-resolution-symbol/runs/<timestamp>/results.json \
  docs/prototypes/grammatical-resolution-symbol/runs/<timestamp>/miss-classifications.json
```

Finalization rejects stale bindings, recomputes every diagnostic and score,
rejects provider errors, and requires every scored miss classification. Evidence
qualifies only with at least 15 attempts, at least 80% exact accuracy, zero
execution errors, and zero unclassified misses.

## Retained evidence

The finalized run at
`runs/2026-08-03T12-55-20-295Z/results.json` scored 17/18 (94.4%)
with zero execution errors and zero unclassified misses. The sole miss is an
independently accepted model limitation: despite the explicit nominal-symbol
rule and demonstration, the model returned Citation for the dative-singular
middle dot instead of the conservative Inflection `{case:"Dat", gender:null,
number:"Sing"}`.
