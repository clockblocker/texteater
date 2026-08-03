# German Phraseme/Collocation Grammatical Resolution evaluation

This route-local vertical slice evaluates the exact
`grammatical-resolution/de/phraseme/collocation` Prompt Source. Its Golden
Corpus has 25 cases: four necessary demonstrations, 18 authoritative disjoint
held-out cases, and three corpus-only identity probes.

## Initial policy

The authoritative scope is conventional non-idiomatic German verbal
support-verb and Funktionsverbgefüge Collocations. The lexical choices are
restricted, but the whole remains compositionally related to its nominal
component. Free verb-object combinations, non-compositional Idioms, paired
Constructions, verb-only targets, and targets that place several lexical
members inside one TARGET pair remain outside this route.

The Dumling Collocation codec has an empty Core and reuses German VERB
Inflectional Features. An explicit entry is Citation. A contextual occurrence
is Inflection and takes the support verb's contextual features. Full Surfaces
mark every settled lexical member separately. Partial Surfaces require at least
two marked distinctive members plus identifying context; `normalizedSurface`
contains only those marked members in sentence order and never invents the
unmarked remainder of the Canonical Form.

The four demonstrations have separate burdens: `eine Entscheidung treffen`
shows full contextual Inflection and three-member orthography alignment; `in
Betracht ziehen` shows Citation; `zur Verfügung stellen` shows conservative
Partial realization; and `ein Buch lesen` establishes the free-combination
boundary. The held-out suite covers finite present and past, imperative,
infinitive, Partizip II, Citation, typo repair, intervening modifiers, another
Partial realization, and the Idiom, Construction, verb-only, and overbroad
boundaries. No resolved demonstration Lemma appears in held-out scoring.

Determiner replacement, bare or plural nominal realization, and alternate
support verbs remain corpus-only probes. Those examples intentionally do not
claim whether the variation belongs to one Collocation Lemma, a Variant
Surface, or a distinct Lemma. The current verbal feature bundle also cannot
record nominal number, so plural policy must not be inferred from schema
availability.

## Bounded evidence runner

The runner makes one serial call per held-out case with `gpt-5-nano`, high
reasoning effort, no retries, `store: false`, and a 16,384-token output cap. It
preflights 15–20 cases before constructing a provider client. Retained evidence
binds the ordered Golden Cases, assembled prompt and schema hashes, model,
reasoning policy, and runner version. Provider output text and complete response
metadata survive parse or schema failures. Imports, tests, checks, and offline
finalization make no model calls.

An explicit live run from `battery/dumgen` can later use:

```sh
bun --env-file ../../.env.local \
  docs/prototypes/grammatical-resolution-collocation/run.ts
```

The live command writes atomically beneath `runs/<timestamp>/results.json` and
exits unsuccessfully until every scored miss is classified offline. Finalize
with:

```sh
bun run docs/prototypes/grammatical-resolution-collocation/run.ts finalize \
  docs/prototypes/grammatical-resolution-collocation/runs/<timestamp>/results.json \
  docs/prototypes/grammatical-resolution-collocation/runs/<timestamp>/miss-classifications.json
```

Finalization rejects stale bindings, recomputes every diagnostic and score,
rejects provider errors, and requires every scored miss classification.
Evidence qualifies only with at least 15 attempts, at least 80% exact accuracy,
zero execution errors, and zero unclassified misses.
