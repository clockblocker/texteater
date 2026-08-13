# German Phraseme/Idiom Grammatical Resolution prototype

This route-local pilot resolves an already classified German Idiom Analysis
Target. The former model contract accepted only `markedContext`, rechecked the
route and selected inventory, and returned a `Resolved | Unresolved` wrapper
around a nullable payload. The current contract accepts exactly
`{markedContext,members}` and returns one total flat DTO. Both input projections
are authoritative.

The model owns member spelling classification and normalization, Phraseme
`realizationCoverage`, Citation versus Inflection Surface grammar, and the
Lemma `canonicalForm`. The application owns German language, Phraseme family,
Idiom kind, empty Lemma Core Features, Surface-to-Lemma linkage, normalized
Surface construction, and successful result construction. The leaf exports a
codec that restores the empty Core Features without exposing them in model
output.

`Partial` is deliberately narrow. It means settled Idiom material is genuinely
unrealized while a particular occurrence and full Lemma remain defensible. The
three corpus examples use recoverable coordination ellipsis in a second
parallel clause. Overt-but-unselected material is not a `Partial` case: target
membership is upstream and authoritative.

## Frozen corpus

The 32 synthetic full-sentence cases are partitioned before live evaluation:

- 6 demonstrations: finite discontinuity, Citation, inserted material,
  source-order normalization, typo repair, and coordination-ellipsis Partial;
- 16 development cases: perfect, future, passive, imperative, subjunctive,
  infinitive and participle grammar; free arguments/modifiers; capitalization,
  typo repair, literal-versus-figurative identical wording, and a second
  ellipsis family;
- 10 untouched acceptance cases: unseen Idiom families covering the same
  grammatical burdens, contextual Proverb/Aphorism/DiscourseFormula/
  Collocation contrasts, repeated forms, and a third ellipsis family.

The exact IDs are frozen in `evaluation-suite.ts`. Contamination keys and
selection checks keep all three partitions disjoint. Every target has exact
`members` equality with its TARGET contents in source order. External
sentences are not copied: all stimuli are synthetic, so no sentence-level
external provenance is claimed.

## Shared evidence runner

The thin route configuration uses the shared direct cached runner with
`gpt-5.6-luna`, no reasoning, low text verbosity, no retries, `store:false`, a
4,096-token response ceiling, and an explicit 30-minute cache breakpoint after
the stable system prompt. Preflight is offline and constructs no provider
client.

The authorized protocol used 16 calls for each of three development rounds and
10 calls for one untouched acceptance run: 58 calls total. Retained usage is
174,764 input tokens, of which 162,115 were cached, plus 6,593 output tokens and
zero reasoning tokens. That is conservatively estimated below $1 under the
shared model policy and well below the leaf's $5 authorization; exact currency
cost requires the provider billing export because Responses usage reports only
tokens.

## Retained evidence

All four current-contract runs are finalized, have zero execution errors, and
classify every miss:

| Phase | Score | Evidence |
| --- | ---: | --- |
| Development 1 | 10/16 (62.5%) | `runs/2026-08-13T09-43-54-262Z/results.json` |
| Development 2 | 13/16 (81.25%) | `runs/2026-08-13T09-45-27-447Z/results.json` |
| Development 3 | 13/16 (81.25%) | `runs/2026-08-13T09-46-40-490Z/results.json` |
| Untouched acceptance | 8/10 (80%) | `runs/2026-08-13T09-47-33-549Z/results.json` |

Round 1 exposed weak guidance for Partizip-II Aspect, lexical versus analytic
`haben`, initial verbal casing, and argument placeholders. The first two were
repaired for subsequent rounds. The remaining stable development limitations
are initial `Blase` preservation and insertion of free argument placeholders
in two Lemmas despite explicit rules and distinct teaching examples.

Untouched acceptance met the configured 80% gate. Its two classified model
limitations are omission of passive `voice:Pass` and misanalysis of selected
infinitive `tun` as Part together with omission of fixed `haben` from the
Lemma. The exact miss inventory and disposition is retained beside every
`results.json` as `miss-classifications.json`. Earlier v2/Batch evidence binds
the obsolete contract and is not evidence for this migration.

From `battery/dumgen`, deterministic checks and offline preflight are:

```sh
bun test tests/internal/grammatical-resolution-idiom.test.ts \
  tests/internal/grammatical-resolution-idiom-runner.test.ts
bun run check
bun run docs/prototypes/grammatical-resolution-idiom/run.ts \
  preflight development 1
```

After explicit authorization, each development round uses `run development
<1|2|3>`, followed by offline `finalize <results.json>
<miss-classifications.json>`. Only after all three finalized rounds may the
orchestrator invoke `preflight acceptance` and `run acceptance`.
