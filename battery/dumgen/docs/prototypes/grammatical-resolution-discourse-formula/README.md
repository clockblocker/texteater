# German Phraseme/DiscourseFormula Grammatical Resolution evaluation

This route-local prototype evaluates the exact
`grammatical-resolution/de/phraseme/discourse-formula` Prompt Source. Its
Golden Corpus has 29 explicit cases: four minimized demonstrations, 20
disjoint held-out cases, and five corpus-only policy probes. Demonstration and
evaluation selection are external to stable case IDs.

The DTO is derived from Dumling's German Phraseme/DiscourseFormula schemas. The
route-local codec fixes Lemma `language`, `family`, and `kind`, plus Surface
`language` and the Lemma link. The model returns only Citation Surfaces; there
is no Inflection branch or inflectional feature bag. Lemma Core Features contain
only the nullable scalar `discourseFormulaRole`.

The scored suite covers all ten role values across demonstrations and
held-outs: Greeting, Farewell, Apology, Thanks, Acknowledgment, Refusal,
Request, Reaction, Initiation, and Transition. It also covers spelling repair,
ordinary initial casing, internal German noun capitalization, exact member
scope, partial and overbroad targets, repeated and unrelated occurrences, and
boundaries to single-word INTJ/lexical material, ordinary compositional
requests, Collocation, Idiom, Proverb, and arbitrary quotation.

Primary references:

- [IDS grammis: grüßen](https://grammis.ids-mannheim.de/verbs/view/400670)
  attests `Guten Morgen` as a greeting.
- [IDS grammis: leidtun](https://grammis.ids-mannheim.de/verbs/view/400735/2)
  describes `Tut mir leid` as an introduction to apology or regret.
- [IDS grammis: sprachliches Handeln](https://grammis.ids-mannheim.de/progr%40mm/6895)
  treats greeting, farewell, and thanks expressions as recurring interactional
  formulas.
- [IDS grammis: Satzadverbialia](https://grammis.ids-mannheim.de/systematische-grammatik/1315)
  supports the caution that `auf keinen Fall` can instead be embedded as an
  ordinary negative adverbial.

## Scalar-role and polyfunction policy

A resolved occurrence receives the one role it enacts in its supplied context,
not an array of every function its Lemma can have. `null` remains available
when the marked multiword expression is clearly a discourse formula but the
ten-value taxonomy has no defensible role. Two `bitte schön` contexts expose
the tension: presentation after a request is provisionally Acknowledgment,
while a bakery order is Request. They share a contamination key and remain
corpus-only. The embedded adverbial use of `auf keinen Fall`, the Aphorism
boundary, and an all-caps casing question are corpus-only as well.

## Bounded evidence runner

The runner is prepared for exactly one serial call per held-out case with
`gpt-5-nano`, high reasoning, a 16,384-token output budget, zero retries, and
`store: false`. It preserves raw provider output and complete response metadata
on parse failures. Draft results are written atomically and are bound by hashes
to the exact prompt, schemas, inputs, ideals, model settings, and suite order.
Finalization recomputes every diagnostic offline, rejects stale bindings and
provider errors, and requires a human classification plus explanation for each
miss. Evidence qualifies at 15 calls, at least 80% exact-contract score, zero
execution errors, and zero unclassified misses.

No live call was made for this route-local slice. Shared generator, package,
catalog, runtime, and persistent logbook integration are owned by the parent
orchestration task. After integration, an explicit run can invoke:

```sh
bun --env-file ../../.env.local \
  docs/prototypes/grammatical-resolution-discourse-formula/run.ts
```

To finalize a retained draft offline, create a JSON sidecar keyed by every
failed case with `prompt-defect`, `corpus-or-evaluator-defect`, or
`accepted-model-limitation` and a non-empty explanation, then run:

```sh
bun docs/prototypes/grammatical-resolution-discourse-formula/run.ts finalize \
  docs/prototypes/grammatical-resolution-discourse-formula/runs/<timestamp>/results.json \
  docs/prototypes/grammatical-resolution-discourse-formula/runs/<timestamp>/miss-classifications.json
```
