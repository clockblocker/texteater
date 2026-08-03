# German Lexeme/SCONJ Grammatical Resolution evaluation

This route-local prototype covers the exact
`grammatical-resolution/de/lexeme/subordinating-conjunction` route without
adding shared prompt generation, package commands, catalog, or runtime wiring.
Its Golden Corpus has 34 cases: four necessary demonstrations, 23 explicitly
pinned held-out cases, and seven corpus-only policy probes. Demonstration and
evaluation selections are disjoint by case, normalized input, and explicit
lemma/form contamination keys. Stable case IDs describe semantics rather than
their current demonstration or evaluation role.

The four demonstrations teach non-redundant policies: an ordinary contextual
SCONJ still has a Citation Surface; the attested reduced clause `wie
besprochen` remains SCONJ and has `ConjType=Comp` without an overt finite verb;
typo repair changes the normalized Surface and clicked-member orthography; and
a bare ambiguous homograph remains Unresolved without clause syntax. The held-out selection covers complement,
conditional, temporal, interrogative, modal, causal, and comparative clause
markers; dictionary citation and ordinary sentence-initial casing; typo
normalization; ADP, ADV, and CCONJ boundaries; comparative phrase-vs-clause
routing; overbroad scope; and multiple TARGET pairs.

The model DTOs are projected from Dumling's German Lexeme/SCONJ Lemma and
Citation Surface schemas. Fixed route fields (`language`, `family`, `kind`) and
the Surface's linked Lemma are absent from model exchange. SCONJ has no Dumling
Inflection Surface. Its complete Core Feature object contains only nullable
`conjType`, whose only non-null German value is `Comp`.

The pure evaluator reports exact diagnostics for the decision/coherence pair,
TARGET-member count and orthographies, every Surface field, Canonical Form, and
the complete Core Feature object. It canonicalizes only an all-null
`surfaceFeatures` bag to `null`, matching the route-local Surface codec.

The bounded runner makes one serial `gpt-5.6-luna` call per held-out case with
no reasoning, no retries, `store: false`, and a 2,048-token route-local response
budget. Import and preflight make no provider call. Draft evidence is written
atomically and cannot meet the evidence threshold until offline finalization.
The retained schema binds the exact prompt, input/output schemas, ordered cases,
model policy, attempts, and recomputed summary. If JSON or schema parsing fails
after a provider response, the raw output text and complete provider metadata
remain attached to the errored attempt. Runs with any execution/provider error
cannot be finalized.

After root integration registers a package command, a deliberate live run can
be started from `battery/dumgen` with:

```sh
bun run prototype:grammatical-resolution-subordinating-conjunction
```

Create a miss-classification sidecar beside the draft result, then finalize
without another provider call:

```sh
bun run docs/prototypes/grammatical-resolution-subordinating-conjunction/run.ts \
  finalize \
  docs/prototypes/grammatical-resolution-subordinating-conjunction/runs/<timestamp>/results.json \
  docs/prototypes/grammatical-resolution-subordinating-conjunction/runs/<timestamp>/miss-classifications.json
```

Each failed case must have exactly one `prompt-defect`,
`corpus-or-evaluator-defect`, or `accepted-model-limitation` classification and
a non-empty explanation. Final evidence additionally requires at least 15
attempted cases, an 80% score, and zero execution/provider errors.

## Linguistic basis and policy probes

The universal [SCONJ definition](https://universaldependencies.org/u/pos/SCONJ.html)
defines a subordinating conjunction as a word linking a subordinate clause to
its head and distinguishes it from ADP and CCONJ by syntactic function. The
[UD German GSD SCONJ statistics](https://universaldependencies.org/treebanks/de_gsd/de_gsd-pos-SCONJ.html)
attest the route's common German inventory and show that forms such as `als`,
`wie`, `während`, and `da` cross multiple POS routes. The universal
[`ConjType=Comp` definition](https://universaldependencies.org/u/feat/ConjType.html)
identifies German comparing conjunctions as the relevant marked subtype.

Seven cases remain corpus-only because they expose real policy or evidence
limits rather than suitable model scoring targets: a targeted multiword
subordinator; colloquial verb-second uses after causal and concessive markers;
historical `daß`; the one foreign SCONJ (`att`) attested by German GSD despite
the current codec's lack of a Foreign feature; and the noisy GSD typo forms
`das` and `den`. The noisy `den` annotation is explicitly Unresolved because
its intended Lemma `denn` belongs to CCONJ. These cases are neither rendered
into the prompt nor included in the evaluation suite.

## Deferred shared registration

Root integration must register the Prompt Source with the generated-prompt
manifest, add the package prototype command, generate the committed module, and
decide whether any policy tension belongs in the persistent prompt logbook.
Catalog and runtime wiring remain deferred to the final integration ticket.
