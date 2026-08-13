# German Lexeme/VERB Grammatical Resolution evaluation

This route-local prototype evaluates the exact
`grammatical-resolution/de/lexeme/verb` Prompt Source. Its Golden Corpus has 46
explicit cases: six demonstrations, 25 disjoint held-out cases, and 15
corpus-only cases. Stable IDs do not encode demonstration or evaluation roles.

The demonstration set combines two compact contract anchors with four
source-backed DW sentences: future plus inherent reflexivity and government,
an incidental reflexive beside a separable verb, modal exclusion from a
passive lexical complex, and a three-part perfect passive. The held-out suite
contains the other eleven DW sentences plus compact controls for present and
past finite morphology, typo repair, and lexical full-verb use of a
modal-shaped spelling.

Together the held-out cases cover finite, infinitive, and participle heads;
perfect, pluperfect, future, passive, and perfect-passive realizations;
attached and detached separable prefixes; lexical reflexivity; governed
prepositions; repeated auxiliary spellings; long-distance members; and
unrelated predicates left in context.

The DTOs are derived from Dumling's German Lexeme/VERB schemas. The route-local
shape fixes Lemma `language`, `family`, and `kind`, plus Surface `language` and
the Lemma link, so the model never repeats them. It preserves the exact
finite, imperative, infinitive, and participle feature shapes, uses
`aspect: null` for German lexical participles, and requires all nullable Core
Feature keys: `hasGovPrep`, `hasSepPrefix`,
and `lexicallyReflexive`. `verbType` and `realizationCoverage` are injected by
the application rather than exposed to the model. Null-only Surface Features
are accepted in Structured Outputs and canonicalized to null by the evaluator.

## Corpus-only policy probes

- Whether `voice: "Pass"` belongs on a lexical participle inside a
  periphrastic passive or only on the whole complex.
- Whether predicative `geschlossen` is a verbal participle or an established
  lexicalized adjective in a given context.
- Whether a contextual `zu` outside supplied membership changes an infinitive
  head's grammatical resolution.

These probes are neither demonstrations nor authoritative scores. Persistent
logbook registration is owned by root integration.

## Bounded evidence runner

The runner makes exactly one direct serial Responses API call for each of the
25 held-out cases
with `gpt-5.6-luna`, no reasoning, a 16,384-token output budget, zero retries,
and `store: false`. It does not use the Batch API or group cases into one model
request. Import and preflight make no provider call. Transport,
JSON, or exact-schema failures retain the available raw response text,
response ID, resolved model, usage, and error metadata.

Every call uses the same deterministic cache key for the assembled system
prompt. The request marks an explicit cache breakpoint at the end of that
stable prompt and sets `prompt_cache_options` to explicit mode with a 30-minute
TTL. The retained run binds the cache key, mode, TTL, and breakpoint policy so
finalization rejects evidence produced under another cache setup. Raw provider
usage is retained for inspecting `cached_tokens` and `cache_write_tokens`.

Shared generator registration, package wiring, prompt logbook updates, and
runtime catalog registration are deliberately outside this route-local slice.
No live call is made while preparing the slice. A later explicit run from
`battery/dumgen` can invoke:

```sh
bun --env-file ../../.env.local \
  docs/prototypes/grammatical-resolution-verb/run.ts
```

Draft results are written atomically below `runs/<timestamp>/results.json` and
cannot meet the evidence threshold until offline human classification.
Provider errors require a fresh bounded run.

Create a JSON sidecar keyed by every failed case, using `prompt-defect`,
`corpus-or-evaluator-defect`, or `accepted-model-limitation`, each with a
non-empty explanation. Then finalize offline:

```sh
bun docs/prototypes/grammatical-resolution-verb/run.ts finalize \
  docs/prototypes/grammatical-resolution-verb/runs/<timestamp>/results.json \
  docs/prototypes/grammatical-resolution-verb/runs/<timestamp>/miss-classifications.json
```

Finalization rejects obsolete prompt, suite, case, schema, model, budget, or
runner bindings; recomputes diagnostics and score; rejects provider errors;
requires every scored miss to be classified; and atomically replaces the
retained JSON. Evidence qualifies at 15 calls, at least 80% exact-contract
score, zero execution errors, and zero unclassified misses.

## Legacy retained evidence

The following runs bind the previous prompt, split, and v2 runner. They are
historical diagnostics and cannot finalize as evidence for the current setup.

The first diagnostic draft at
`runs/2026-08-03T12-55-20-274Z/results.json` scored 12/20 and exposed a
systemic TARGET-scope ambiguity. The prompt was repaired without changing any
demonstration, oracle, or evaluation ID: it now applies a mechanical member
gate, distinguishes separable prefixes from governed prepositions, and gives
the exact German participle feature object.

The finalized fresh run at
`runs/2026-08-03T13-14-03-973Z/results.json` scored 16/20 (80.0%) with zero
execution errors and zero unclassified misses. Independent reviewers accepted
four isolated model limitations: treating directional `nach Hause` as lexical
government, copying a contextual zu-infinitive into Lemma canonical form,
inventing `Aspect=Perf` on one participle, and resolving modal-AUX `kann` on
the fixed VERB route. The repaired government, separability, reflexivity,
full-modal, and all three overbroad-scope cases passed.
