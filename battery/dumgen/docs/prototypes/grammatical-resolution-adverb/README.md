# German Lexeme/ADV grammatical-resolution evidence

Issue [#104](https://github.com/clockblocker/texteater/issues/104) migrates
this leaf to the total classified-target contract established by #90 and the
#91 migration matrix.

## Contract

The model receives exactly `{ markedContext, members }`. The two projections
are authoritative and positionally aligned; this leaf never repairs, rejects,
or reclassifies target membership. The model returns the flat codec-derived
ADV DTO:

```text
{
  memberOrthographies,
  normalizedMembers,
  surface: Citation | Inflection(Degree),
  lemma: { canonicalForm, coreFeatures: { foreign, numType, pronType } }
}
```

The application owns German route identity, Surface-to-Lemma linkage,
`normalizedSurface`, successful resolution, and `Full` realization coverage.
The model owns the Citation/Inflection discriminator because the ADV codec has
both Surface kinds. Inflection is restricted to non-null `Cmp | Pos | Sup`;
invariant contextual occurrences use Citation.

## Frozen partitions

The 37 realistic full-sentence cases are frozen into disjoint selections:

- demonstrations: 6 cases;
- classified development: 19 cases;
- untouched acceptance: 12 cases.

Coverage includes temporal and locative ADV, demonstrative, indefinite,
interrogative, relative, and negative pronominal classes, Card and Mult,
Foreign, every supported Degree, initial capitalization, abbreviation, typo,
licensed spelling variant, archaic use, and fixed-route contrasts against ADJ,
PART, ADP, SCONJ, and PairedFrame payload. Exact IDs are pinned in the Prompt
Source, evaluation suite, and focused tests.

## Deterministic gate

From `battery/dumgen`:

```sh
bun test tests/internal/grammatical-resolution-adverb.test.ts \
  tests/internal/grammatical-resolution-adverb-runner.test.ts
bun run check
bunx biome check \
  src/promptsmith/production/grammatical-resolution/de/lexeme/adverb \
  src/promptsmith/laboratory/experiments/grammatical-resolution-adverb \
  docs/prototypes/grammatical-resolution-adverb/run.ts \
  tests/internal/grammatical-resolution-adverb.test.ts \
  tests/internal/grammatical-resolution-adverb-runner.test.ts
bun docs/prototypes/grammatical-resolution-adverb/run.ts \
  preflight development 1
```

Preflight is zero-call and must not construct a provider client.

## Authorized live protocol

No provider call is allowed without orchestrator authorization. Once
authorized, run three serial development rounds, classify every scored miss,
and finalize each result offline before continuing. Failed exact cases remain
held out. Run untouched acceptance exactly once only after the development
gate succeeds.

```sh
bun --env-file ../../.env.local \
  docs/prototypes/grammatical-resolution-adverb/run.ts run development 1

bun docs/prototypes/grammatical-resolution-adverb/run.ts finalize \
  docs/prototypes/grammatical-resolution-adverb/runs/<timestamp>/results.json \
  docs/prototypes/grammatical-resolution-adverb/runs/<timestamp>/miss-classifications.json

bun --env-file ../../.env.local \
  docs/prototypes/grammatical-resolution-adverb/run.ts run acceptance
```

The current protocol has 69 calls: `19 × 3` development plus 12 acceptance. A
deliberately pessimistic assumption that every call consumes the full
4,096-token output cap and all input is uncached remains below about `$1.80`;
retained provider usage is authoritative after each run. A practical reserve of
`$0.15` is expected from the currently integrated cached-run evidence, but it is
not a spending guarantee.

The retained `2026-08-03` run directories predate this input, output, corpus,
model binding, and phase protocol. They remain historical evidence only and do
not satisfy issue #104.

## Retained current-contract evidence

The authorized protocol completed on 2026-08-13 with 68 serial provider calls,
zero execution errors, and every development miss classified. Round 1 used the
initial 18-case development selection; its two source-backed corpus corrections
split the provisional combined `viel` oracle into independent Pos and Card
cases, producing the final 19-case development selection for rounds 2 and 3.

| Phase | Retained result | Score | Miss disposition |
| --- | --- | ---: | --- |
| Development 1 | `runs/2026-08-13T11-08-49-321Z/results.json` | 12/18 (66.7%) | Four casing-normalization prompt defects; two corpus/evaluator defects in combined `viel` features and `ca` Foreign |
| Development 2 | `runs/2026-08-13T11-12-09-067Z/results.json` | 17/19 (89.5%) | Two prompt defects: digit-x Card identity and preserving lemma Core Features across a licensed spelling variant |
| Development 3 | `runs/2026-08-13T11-13-29-652Z/results.json` | 18/19 (94.7%) | One accepted model limitation: the pre-reform variant still lost PronType Ind despite the general correlation rule |
| Untouched acceptance | `runs/2026-08-13T11-14-24-146Z/results.json` | 12/12 (100%) | None |

The round-1 corpus correction is backed by official UD German-GSD
[NumType statistics](https://universaldependencies.org/treebanks/de_gsd/de_gsd-feat-NumType.html):
the only ADV `NumType=Card` form is `2x`, while ordinary `viel` is among ADV
forms without NumType. German-GSD
[PronType statistics](https://universaldependencies.org/treebanks/de_gsd/de_gsd-feat-PronType.html)
also explicitly list `bisschen`, `bischen`, and `bißchen` as ADV
`PronType=Ind`. The prompt changes therefore teach general feature correlations
rather than copying an exact failed case into demonstrations. The selected
round-3 and acceptance prompt SHA is
`a493c8dfecc3d03b8e0e6406cfc28ab067daa0d9899778c6826ffeb890620034`.

The four retained runs report 173,506 input tokens, including 163,693 cached
tokens and 7,505 cache-write tokens, plus 4,866 output tokens and zero reasoning
tokens. At published Luna rates of `$1.00/M` ordinary input, `$0.10/M` cached
input, `$1.25/M` cache-write input, and `$6.00/M` output, the measured content
estimate is `$0.05725455`, safely below both the `$0.15` reserve and the
authorized `$5` leaf cap. Exact billed cost remains authoritative in the
provider billing export.

The untouched acceptance reservation is retained at
`runs/acceptance-reservation.json`; acceptance passed without a prompt defect,
so the replacement protocol was not invoked and the suite must not be run
again.
