# German Lexeme/AUX Grammatical Resolution evaluation

This route-local prototype evaluates the exact
`grammatical-resolution/de/lexeme/auxiliary` Prompt Source. Its Golden Corpus
contains 29 cases covering finite, infinitive, imperative, and participial
forms, Citation versus
Inflection Surfaces, ordinary versus modal Core Features, copular `sein`,
orthography, normalization, and fixed-route boundaries. Five cases are
demonstrations and 18 settled, explicitly pinned cases form the disjoint
held-out suite of 22 cases. Two policy cases remain corpus-only: lexical `werden` keeps the
particularly important AUX/VERB boundary reviewable without leaking the
`werden` demonstration into scoring, while `möchte` is excluded because
German descriptions disagree on whether its canonical Lemma is `mögen` or an
independent `möchten`. Resolved demonstration Lemmas are absent from held-out
scoring.

The route policy follows the [UD German language
overview](https://universaldependencies.org/de/) for the closed AUX inventory
and copular `sein`, and the IDS grammis descriptions of
[auxiliary-verb function](https://grammis.ids-mannheim.de/systematische-grammatik/1525)
and [modal verbs](https://grammis.ids-mannheim.de/systematische-grammatik/380)
for the auxiliary/full-verb distinction and German inflectional behavior.

The five demonstrations each carry one burden:

- future-forming `wird` establishes ordinary AUX inflection and
  `verbType=null`;
- modal `kann` establishes `verbType=Mod`;
- explicitly cited `dürfen` distinguishes Citation from Inflection Surfaces;
- misspelled `sol` establishes orthographic repair; and
- full-verb `schläft` establishes fixed-route rejection.

The bounded runner makes one serial call per held-out case with the catalog's
current model, low reasoning effort, no retries, `store: false`, and a
2,048-token route-local output cap. It preflights 15–25 cases against the exact
authored schemas before constructing a provider client. Retained evidence binds
the ordered cases and Golden Case values, assembled prompt and schema hashes,
catalog policy, runner version, response metadata, diagnostics, and errors.
Runner v2 also retains the raw `output_text` and complete response metadata when
the provider responds but JSON parsing or exact schema parsing fails, preserving
the evidence needed to distinguish provider-shape failures from transport
errors. Imports, tests, validation, and finalization never make provider calls.

The model Inflection Surface uses an explicit provider-safe structural union for
finite indicative/subjunctive, imperative, infinitive, and participial forms.
Every branch requires a non-null `verbForm`; a Structured Outputs payload cannot
pass provider structure with an all-null feature bag and then fail only in a
local refinement.

Root integration registers the Prompt Source and package command. After that,
an explicit live draft run from `battery/dumgen` is:

```sh
bun run prototype:grammatical-resolution-auxiliary
```

The live command writes atomically beneath `runs/<timestamp>/results.json` and
always exits unsuccessfully until every scored miss is classified offline.
Provider errors require a fresh run.

## Evidence finalization

Create a sidecar keyed by every failed case ID, using `prompt-defect`,
`corpus-or-evaluator-defect`, or `accepted-model-limitation`, then finalize:

```sh
bun run docs/prototypes/grammatical-resolution-auxiliary/run.ts finalize \
  docs/prototypes/grammatical-resolution-auxiliary/runs/<timestamp>/results.json \
  docs/prototypes/grammatical-resolution-auxiliary/runs/<timestamp>/miss-classifications.json
```

Finalization rejects stale bindings, recomputes every diagnostic and score,
rejects provider errors, and requires every miss classification. Evidence
qualifies only with at least 15 attempts, 80% exact contract accuracy, zero
execution errors, and zero unclassified misses.
