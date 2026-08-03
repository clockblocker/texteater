# German Lexeme/NUM Grammatical Resolution evaluation

This route-local vertical slice evaluates the exact
`grammatical-resolution/de/lexeme/numeral` Prompt Source. Its Golden Corpus has
31 explicit cases: four necessary demonstrations, 15 authoritative and
disjoint held-out cases, four corpus-only representation disputes, and eight
corpus-only semantic mirrors retained as future regression material. The
held-out suite covers word and digit cardinals, years, Roman numerals,
sentence-initial normalization, typo repair, inflected quantity numerals,
Citation versus Inflection Surfaces, and DET/ADV/ADJ/PROPN/SYM boundaries. It
also rejects multi-token numerical phrases, repeated occurrences, unrelated
targets, and overbroad target spans. Resolved demonstration Lemmas are absent
from held-out scoring.

## Primary-source policy

The policy is grounded in these primary annotation and codec sources:

- [Universal Dependencies NUM](https://universaldependencies.org/u/pos/NUM.html)
  defines cardinal numbers written as words, digits, or Roman numerals as NUM,
  while ordinals are normally ADJ and multiplicatives ADV.
- [UD German DET](https://universaldependencies.org/de/pos/DET.html) explicitly
  keeps `beide` in DET and reserves German NUM for definite cardinals.
- [German GSD NUM statistics](https://universaldependencies.org/treebanks/de_gsd/de_gsd-pos-NUM.html)
  show that German NUM tokens overwhelmingly carry `NumType=Card`, while
  quantity numerals such as `Million/Millionen` may carry Case, Gender, and
  Number.
- [German GSD NumType statistics](https://universaldependencies.org/treebanks/de_gsd/de_gsd-feat-NumType.html)
  show ordinals overwhelmingly on ADJ and numerical name components on PROPN.
- Dumling's local German NUM feature codec is the executable authority for the
  DTO: Core Features are exactly `abbr`, `foreign`, and `numType`; Inflection
  Features are exactly `case`, `gender`, and `number`, with at least one
  non-null value.

The exact codec has no `NumForm` feature. Consequently digit and word spellings
remain distinct canonical identities: `7` is not rewritten to `sieben`.
Authoritative resolved cases use `NumType=Card`. The codec also permits `Frac`,
`Mult`, and `Range`, but German GSD does not provide a stable matching NUM
policy: fraction glyphs appear as Card, ordinary multiplicatives are ADV, and
range tokenization is not stable enough for a one-Lexeme oracle. Fraction,
range, and compact `2x` cases therefore remain corpus-only and Unresolved until
domain policy decides their representation. A fourth corpus-only probe records
the potential exact `T` → `Tausend` abbreviation representation with
`Abbr=Yes`, without teaching or scoring that unsettled Lemma identity.

The demonstrations each carry one distinct burden: an ordinary word cardinal
shows the resolved Citation shape, inflected `Millionen` shows agreement and
lemmatization, misspelled `dreii` shows orthographic repair, and an overbroad
cardinal-plus-noun target shows scope rejection. Digit, Roman-numeral, ordinal,
multiplicative, and semantically mirrored word/inflection/typo cases remain out
of the assembled demonstrations. Explicit contamination keys keep those
mirrors from silently entering evaluation, and no demonstration Lemma appears
in held-out scoring.

## Bounded evidence runner

The runner makes one serial call per held-out case with `gpt-5-nano`, high
reasoning effort, no retries, `store: false`, and a 16,384-token route-local
output cap. It preflights 15–25 cases before constructing a provider client.
Retained evidence binds the ordered Golden Cases, assembled prompt and schema
hashes, intended registration policy, model, reasoning policy, and runner
version. Provider output text and complete response metadata survive JSON or
exact-schema parse failures, so a shape error is not flattened into a transport
failure. Imports, tests, checks, and finalization make no provider calls.

The model Inflection Surface uses a provider-safe structural union. Each branch
requires a non-null case, gender, or number, mirroring Dumling's non-empty
refinement in JSON Schema rather than admitting an all-null provider payload.

Root integration registers this Prompt Source for generation, commits the
generated module, and provides the package prototype command. Catalog/runtime
wiring and live API evidence remain deferred. An explicit live draft run from
`battery/dumgen` can use:

```sh
bun run prototype:grammatical-resolution-numeral
```

The live command writes atomically beneath `runs/<timestamp>/results.json` and
always exits unsuccessfully until every scored miss is classified offline.
Provider errors require a fresh bounded run.

To finalize, create a sidecar keyed by every failed case ID with
`prompt-defect`, `corpus-or-evaluator-defect`, or
`accepted-model-limitation`, then run:

```sh
bun run docs/prototypes/grammatical-resolution-numeral/run.ts finalize \
  docs/prototypes/grammatical-resolution-numeral/runs/<timestamp>/results.json \
  docs/prototypes/grammatical-resolution-numeral/runs/<timestamp>/miss-classifications.json
```

Finalization rejects stale bindings, recomputes every diagnostic and score,
rejects provider errors, and requires every scored miss classification. Evidence
qualifies only with at least 15 attempts, at least 80% exact contract accuracy,
zero execution errors, and zero unclassified misses.
