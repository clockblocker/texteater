# Issue 116 German Grammatical Resolution final evidence audit

Date: 2026-08-13

Scope: the 21 routes migrated by Wayfinder #90. `Lexeme/VERB` is the process
reference; `Phraseme/Collocation`, Morphemes, and `Lexeme/PUNCT` are excluded.

## Result

All 21 scoped leaves have a flat total model contract, at least 30 current
Golden Cases, disjoint current demonstration/development/acceptance selections,
three finalized classified development rounds, terminal untouched acceptance
evidence, retained prompt/schema/suite/cache bindings, and a disposition for
every terminal miss. Every terminal acceptance run is threshold-met and has
zero execution errors. Terminal misses are accepted model limitations only.

The complete retained ledger does **not** literally satisfy #90/#116's
zero-execution-error criterion across every fresh live run. One phase-bound PRON
diagnostic attempt recorded a provider schema error before the qualifying
development cycle described below. Preserving and excluding that attempt from
the qualifying rounds is a transparent protocol exception, not evidence that
the criterion was met. Closing #116 therefore requires an explicit acceptance
of or waiver for this retained anomaly.

The shared direct runner preserved every superseded attempt and each one-shot
acceptance reservation. Recovery suites use fresh IDs and fresh input/oracle
fingerprints. The runner rejects acceptance reuse and requires three new bound
development rounds after a replaceable acceptance defect.

## Terminal route ledger

| Route | Current corpus (demo/dev/accept) | Terminal acceptance |
| --- | ---: | ---: |
| Lexeme/ADJ | 6/18/12 | 12/12 |
| Lexeme/ADP | 6/21/12 | 11/12 |
| Lexeme/ADV | 6/19/12 | 12/12 |
| Phraseme/Aphorism | 6/16/10 | 8/10 |
| Lexeme/AUX | 6/18/12 | 12/12 |
| Lexeme/CCONJ | 6/18/12 | 12/12 |
| Lexeme/DET | 9/21/12 | 12/12 |
| Phraseme/DiscourseFormula | 6/18/10 | 9/10 |
| Construction/Fusion | 6/18/10 | 10/10 |
| Phraseme/Idiom | 6/16/10 | 8/10 |
| Lexeme/INTJ | 7/21/14 | 14/14 |
| Lexeme/NOUN | 6/21/13 | 12/13 |
| Lexeme/NUM | 7/19/12 | 11/12 |
| Lexeme/X | 8/18/10 | 8/10 |
| Construction/PairedFrame | 6/18/10 | 10/10 |
| Lexeme/PART | 9/21/12 | 12/12 |
| Lexeme/PRON | 6/21/12 | 12/12 |
| Lexeme/PROPN | 13/21/12 | 10/12 |
| Phraseme/Proverb | 6/18/10 | 10/10 |
| Lexeme/SCONJ | 7/22/15 | 14/15 |
| Lexeme/SYM | 12/21/12 | 11/12 |

## Binding interpretation and retained anomaly

The original protocol requires three consecutive finalized and classified
development rounds, permits evidence-driven prompt iteration between them, and
then selects the best observed contract for untouched acceptance. Eleven early
routes exercised that permitted iteration, so their final accepted prompt hash
appears in only one or two of the three pre-acceptance rounds. Later recovery
cycles use the stricter shared-runner rule: all three post-failure rounds must
match the replacement acceptance binding. No accepted evidence is relabelled.

PRON retains one explicitly ineligible diagnostic attempt at
`runs/2026-08-13T10-25-06-884Z`. A provider output violated the schema, so the
runner refused finalization. The draft records one execution error and
`unclassifiedMissCount: 13`; its retained sidecar nevertheless supplies a
disposition for all 14 non-passing cases. It is not counted as a qualifying
development round, but it was a fresh phase-bound live attempt and therefore
prevents a literal zero-error claim over the complete ledger. The next 321 PRON
calls, including the final bound recovery sequence and clean 12/12 acceptance,
are error-free and fully classified. The failed artifact remains immutable
rather than being deleted or misrepresented.

## Usage

Across 154 modern phase-bound retained runs: 2,776 calls; 7,701,231 input
tokens (7,393,170 cached, 199,452 cache-write, 108,609 ordinary); and 231,667
output tokens. At the documented evaluation rates this is an estimated
`$2.487243`. Provider billing export remains authoritative.

## Final architecture

- Grammatical Resolution input is exactly `{ markedContext, members }`.
- Model output is a route-specific flat total DTO; no route decision or
  `Unresolved` wrapper is reachable.
- Application projection owns language, route identity, Surface/Lemma linkage,
  normalized Surface, success, and Full for Lexeme/Construction.
- Phraseme output retains model-owned `Full | Partial`.
- VERB uses ordinary direct dispatch; declarative projection injects
  `verbType: null` while retaining latent `hasGovPrep`.
- The NOUN-only Ergänzungsstrich policy is fixed by system ADRs 0003/0004 and
  locked at Source Segmentation, Target Classification, and NOUN projection.
- Runtime catalog/inventory contains 22 total flat routes: the 21 migrated
  leaves plus VERB. Collocation and PUNCT are explicit NotImplemented routes.
- The excluded Collocation Prompt Source, its generated **laboratory** prompt,
  focused experiment, and Collocation-only Batch runner remain as historical
  research infrastructure. None is imported by the runtime catalog or makes
  Collocation reachable; #90/#116 deliberately do not modernize or delete that
  excluded experiment.
