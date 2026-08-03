# German Lexeme/PART Grammatical Resolution evaluation

This route-local prototype covers the exact
`grammatical-resolution/de/lexeme/particle` route. Root integration registers
it for prompt generation, commits the generated module, and provides the
package prototype command; catalog and runtime wiring remain deferred. Its Golden Corpus has
28 cases: four necessary demonstrations, 22 explicitly pinned held-out cases,
and two corpus-only policy probes. Demonstration and evaluation selections are
disjoint by case, normalized input, and explicit lemma/form contamination keys;
no demonstration Lemma appears in the held-out selection.

The demonstrations teach four non-redundant policies: a contextual modal
particle still has a Citation Surface with null Core Features under the exact
codec; typo repair changes normalization and orthography status; a German
separable-verb prefix stays outside PART; and a standalone negative response is
an INTJ rather than the negative particle `nicht`. The held-out selection
covers negative `nicht`, infinitival `zu`, seven lemma-disjoint modal-particle
uses, ordinary casing, typo normalization, repeated tokens, a bare ambiguous
label, and ADV, INTJ, CCONJ, SCONJ, ADP, separable-verb, and discourse-Phraseme
boundaries. It also tests overbroad and multiple TARGET scopes.

The model DTOs are projected from Dumling's German Lexeme/PART Lemma and
Citation Surface schemas. The fixed route fields `language`, `family`, `kind`,
and the Surface's linked Lemma are absent from the model exchange. PART has no
Dumling Inflection Surface. The complete model Core Feature object is `abbr`,
`foreign`, `partType`, and `polarity`; the German codec permits only
`PartType=Inf` and `Polarity=Neg|Pos` as non-null values.

The pure evaluator reports exact diagnostics for the decision/coherence pair,
TARGET-member count and orthographies, every Surface field, Canonical Form, and
the complete Core Feature object. It canonicalizes only the all-null
`surfaceFeatures` bag in the same way as the route-local Surface codec.

The bounded runner makes one serial `gpt-5-nano` call per held-out case with low
reasoning, no retries, `store: false`, and a 2,048-token route-local response
budget. Import and preflight make no provider call. Draft evidence is written
atomically and cannot meet the evidence threshold until offline finalization.
The retained schema binds the exact prompt, input/output schemas, ordered cases,
model policy, attempts, and recomputed summary. If JSON or schema parsing fails
after a provider response, the raw output text and complete provider metadata
remain attached to the errored attempt. Runs with any execution/provider error
cannot be finalized.

A deliberate live run can be started from `battery/dumgen` after shared review:

```sh
bun run prototype:grammatical-resolution-particle
```

Create a miss-classification sidecar beside the draft result, then finalize
without another provider call:

```sh
bun run docs/prototypes/grammatical-resolution-particle/run.ts \
  finalize \
  docs/prototypes/grammatical-resolution-particle/runs/<timestamp>/results.json \
  docs/prototypes/grammatical-resolution-particle/runs/<timestamp>/miss-classifications.json
```

Each failed case must have exactly one `prompt-defect`,
`corpus-or-evaluator-defect`, or `accepted-model-limitation` classification and
a non-empty explanation. Final evidence additionally requires at least 15
attempted cases, an 80% score, and zero execution/provider errors.

## Linguistic basis and policy probes

The [UD German overview](https://universaldependencies.org/de/) identifies
`nicht` and infinitival `zu` as German PART, states that German uses only
`Polarity=Neg`, and distinguishes infinitives from finite verbs and
participles. The universal [PART definition](https://universaldependencies.org/u/pos/PART.html)
explicitly excludes German separable-verb prefixes from PART, while the
[PartType definition](https://universaldependencies.org/u/feat/PartType.html)
defines `Inf` for German `zu` and documents `Vbp` for separated prefixes.
The draft makes one explicit cross-taxonomy decision: IDS owns lexical route
membership for traditional modal/attenuation particles, while UD supplies the
Core Feature vocabulary that the Dumling codec can represent. The modal
inventory and its clause-level, non-answer behavior therefore follow the Leibniz
Institute for the German Language's primary grammis descriptions of
[Abtönungspartikeln](https://grammis.ids-mannheim.de/terminologie/2) and their
[distribution](https://grammis.ids-mannheim.de/systematische-grammatik/769).
The grammis [Negationspartikel](https://grammis.ids-mannheim.de/terminologie/164)
description supports keeping clause-negating `nicht` distinct from a
standalone response.

Two uncertain annotations are intentionally corpus-only. One asks whether the
codec's `Polarity=Pos` should identify an explicitly affirmative PART `ja`
despite current German UD policy using only `Neg`; the other asks whether an
English negative particle inside German context belongs to a German Lemma with
`foreign=Yes` or should be stopped earlier by the language/segmentation
boundary. Neither case is demonstrated or scored.

## Deferred shared registration

Root integration has registered this Prompt Source with the
generated-system-prompt manifest, committed the generated particle module, and
added `prototype:grammatical-resolution-particle`. The catalog/runtime remains
for the final integration ticket. The shared prompt logbook intentionally keeps
the broader UD-versus-IDS policy tension visible even though this draft now
states the ownership rule it evaluates.
