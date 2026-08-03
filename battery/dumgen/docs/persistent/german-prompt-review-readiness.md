# German prompt review-readiness evidence index

Audit date: 2026-08-03. Scope: Wayfinder issue
[`#29`](https://github.com/clockblocker/texteater/issues/29), audited by
[`#55`](https://github.com/clockblocker/texteater/issues/55).

## Verdict

**GO for detailed maintainer review.** All 24 scoped prompts have retained,
finalized evidence at or above 80%, with no execution errors or unclassified
misses.

The five newest artifacts use the current `gpt-5.6-luna` / `none` policy and
OpenAI Batch transport. The older 19 passing artifacts predate that policy
change and retain their recorded `gpt-5-nano` model and reasoning metadata;
they have not been relabeled or represented as Luna runs.

The human-review queue for policy questions is the
[Prompt Logbook](./prompt-logbook.md).

## Route evidence

Every row has a route-local Golden Corpus. `Cases / demos / held out` reports
the exact current selection sizes. All demonstration and evaluation selections
are disjoint, all held-out selections meet the minimum of 15, and the explicit
demonstration selections remain smaller than the held-out selections. Demo
minimality is a semantic authoring judgment rather than a count-only invariant;
the listed counts make that judgment visible for review.

`Misses classified` means the retained artifact has no unclassified miss and
its sidecar classifies each miss. Links point to the authoritative JSON
artifacts, not issue-summary prose.

| Prompt | Cases / demos / held out | Retained evidence | Misses classified |
| --- | ---: | --- | --- |
| Reading `de` | 68 / 5 / 23 | [20/23 (87.0%)](../prototypes/reading-resolution-gauntlet/runs/2026-08-03T07-09-02-584Z/results.json) | [Yes](../prototypes/reading-resolution-gauntlet/runs/2026-08-03T07-09-02-584Z/miss-classifications.json) |
| Lexeme `ADJ` | 26 / 2 / 17 | [15/17 (88.2%)](../prototypes/grammatical-resolution-adjective/runs/2026-08-03T10-51-46-401Z/results.json) | [Yes](../prototypes/grammatical-resolution-adjective/runs/2026-08-03T10-51-46-401Z/miss-classifications.json) |
| Lexeme `ADP` | 27 / 7 / 17 | [14/17 (82.4%)](../prototypes/grammatical-resolution-adposition/runs/2026-08-03T07-59-43-780Z/results.json) | [Yes](../prototypes/grammatical-resolution-adposition/runs/2026-08-03T07-59-43-780Z/miss-classifications.json) |
| Lexeme `ADV` | 32 / 9 / 15 | [13/15 (86.7%)](../prototypes/grammatical-resolution-adverb/runs/2026-08-03T09-35-28-263Z/results.json) | [Yes](../prototypes/grammatical-resolution-adverb/runs/2026-08-03T09-35-28-263Z/miss-classifications.json) |
| Lexeme `AUX` | 29 / 5 / 22 | [19/22 (86.4%)](../prototypes/grammatical-resolution-auxiliary/runs/2026-08-03T08-39-32-051Z/results.json) | [Yes](../prototypes/grammatical-resolution-auxiliary/runs/2026-08-03T08-39-32-051Z/miss-classifications.json) |
| Lexeme `CCONJ` | 27 / 5 / 18 | [16/18 (88.9%)](../prototypes/grammatical-resolution-coordinating-conjunction/runs/2026-08-03T07-46-46-507Z/results.json) | [Yes](../prototypes/grammatical-resolution-coordinating-conjunction/runs/2026-08-03T07-46-46-507Z/miss-classifications.json) |
| Lexeme `DET` | 29 / 8 / 19 | [17/19 (89.5%)](../prototypes/grammatical-resolution-determiner/runs/2026-08-03T09-23-38-554Z/results.json) | [Yes](../prototypes/grammatical-resolution-determiner/runs/2026-08-03T09-23-38-554Z/miss-classifications.json) |
| Lexeme `INTJ` | 24 / 5 / 18 | [15/18 (83.3%)](../prototypes/grammatical-resolution-interjection/runs/2026-08-03T07-58-28-248Z/results.json) | [Yes](../prototypes/grammatical-resolution-interjection/runs/2026-08-03T07-58-28-248Z/miss-classifications.json) |
| Lexeme `NOUN` | 26 / 7 / 15 | [12/15 (80.0%)](../prototypes/grammatical-resolution-noun/runs/2026-08-03T07-19-07-179Z/results.json) | [Yes](../prototypes/grammatical-resolution-noun/runs/2026-08-03T07-19-07-179Z/miss-classifications.json) |
| Lexeme `NUM` | 31 / 4 / 15 | [13/15 (86.7%)](../prototypes/grammatical-resolution-numeral/runs/2026-08-03T10-07-10-718Z/results.json) | [Yes](../prototypes/grammatical-resolution-numeral/runs/2026-08-03T10-07-10-718Z/miss-classifications.json) |
| Lexeme `PART` | 28 / 4 / 22 | [20/22 (90.9%)](../prototypes/grammatical-resolution-particle/runs/2026-08-03T10-16-05-750Z/results.json) | [Yes](../prototypes/grammatical-resolution-particle/runs/2026-08-03T10-16-05-750Z/miss-classifications.json) |
| Lexeme `PRON` | 36 / 4 / 21 | [17/21 (81.0%)](../prototypes/grammatical-resolution-pronoun/runs/2026-08-03T12-15-05-441Z/results.json) | [Yes](../prototypes/grammatical-resolution-pronoun/runs/2026-08-03T12-15-05-441Z/miss-classifications.json) |
| Lexeme `PROPN` | 30 / 4 / 18 | [16/18 (88.9%)](../prototypes/grammatical-resolution-proper-noun/runs/2026-08-03T12-05-26-832Z/results.json) | [Yes](../prototypes/grammatical-resolution-proper-noun/runs/2026-08-03T12-05-26-832Z/miss-classifications.json) |
| Lexeme `SCONJ` | 34 / 4 / 23 | [22/23 (95.7%)](../prototypes/grammatical-resolution-subordinating-conjunction/runs/2026-08-03T12-04-00-262Z/results.json) | [Yes](../prototypes/grammatical-resolution-subordinating-conjunction/runs/2026-08-03T12-04-00-262Z/miss-classifications.json) |
| Lexeme `SYM` | 29 / 4 / 18 | [17/18 (94.4%)](../prototypes/grammatical-resolution-symbol/runs/2026-08-03T12-55-20-295Z/results.json) | [Yes](../prototypes/grammatical-resolution-symbol/runs/2026-08-03T12-55-20-295Z/miss-classifications.json) |
| Lexeme `VERB` | 31 / 4 / 20 | [16/20 (80.0%)](../prototypes/grammatical-resolution-verb/runs/2026-08-03T13-14-03-973Z/results.json) | [Yes](../prototypes/grammatical-resolution-verb/runs/2026-08-03T13-14-03-973Z/miss-classifications.json) |
| Lexeme `X` | 26 / 4 / 19 | [19/19 (100%)](../prototypes/grammatical-resolution-other/runs/2026-08-03T12-55-20-418Z/results.json) | No misses |
| Phraseme `Aphorism` | 26 / 4 / 20 | [17/20 (85.0%)](../prototypes/grammatical-resolution-aphorism/runs/2026-08-03T16-00-15-793Z/results.json) | [Yes](../prototypes/grammatical-resolution-aphorism/runs/2026-08-03T16-00-15-793Z/miss-classifications.json) |
| Phraseme `Collocation` | 28 / 5 / 20 | [16/20 (80.0%)](../prototypes/grammatical-resolution-collocation/runs/2026-08-03T16-12-57-637Z/results.json) | [Yes](../prototypes/grammatical-resolution-collocation/runs/2026-08-03T16-12-57-637Z/miss-classifications.json) |
| Phraseme `DiscourseFormula` | 29 / 4 / 20 | [16/20 (80.0%)](../prototypes/grammatical-resolution-discourse-formula/runs/2026-08-03T14-31-39-814Z/results.json) | [Yes](../prototypes/grammatical-resolution-discourse-formula/runs/2026-08-03T14-31-39-814Z/miss-classifications.json) |
| Phraseme `Idiom` | 31 / 5 / 20 | [19/20 (95.0%)](../prototypes/grammatical-resolution-idiom/runs/2026-08-03T16-47-17-938Z/results.json) | [Yes](../prototypes/grammatical-resolution-idiom/runs/2026-08-03T16-47-17-938Z/miss-classifications.json) |
| Phraseme `Proverb` | 26 / 4 / 20 | [19/20 (95.0%)](../prototypes/grammatical-resolution-proverb/runs/2026-08-03T14-47-28-312Z/results.json) | [Yes](../prototypes/grammatical-resolution-proverb/runs/2026-08-03T14-47-28-312Z/miss-classifications.json) |
| Construction `Fusion` | 25 / 4 / 20 | [18/20 (90.0%)](../prototypes/grammatical-resolution-fusion/runs/2026-08-03T16-00-15-793Z/results.json) | [Yes](../prototypes/grammatical-resolution-fusion/runs/2026-08-03T16-00-15-793Z/miss-classifications.json) |
| Construction `PairedFrame` | 24 / 4 / 20 | [20/20 (100%)](../prototypes/grammatical-resolution-paired-frame/runs/2026-08-03T16-00-15-793Z/results.json) | No misses |

## Scope guardrails

- Reading remains exactly one `reading-resolution/de` Prompt Source. Its
  model input is still only `markedContext`, spelled `lemma`, and
  `existingEmojiDescriptions`; Family and Kind are absent.
- The grammatical Prompt Source tree contains exactly the scoped 16 Lexeme,
  five Phraseme, and two Construction leaves. There is no Morpheme or
  Lexeme/PUNCT Prompt Source.
- The Reading corpus imports no Morpheme collection and the held-out suite has
  no Morpheme or PUNCT case. `cases/wip/morpheme.ts` remains unimported.
- No WIP Reading case was promoted to `hand-verivied`. The sole existing
  `hand-verivied/adp.ts` module remains the only hand-verified collection.
  It was not byte-for-byte immutable over the map: issue #31's independent
  review corrected one existing `nach` oracle from `🪞` to `🟰`. That is an
  oracle revision, not a WIP promotion or a new hand-verification claim.
- This audit does not assert that WIP Reading cases have received maintainer
  hand verification, and it does not promote the draft beyond the laboratory.

## Evidence integrity and residual risks

- Retained JSON is authoritative. At audit time, the `#29` Decisions summary
  overstates three scores: NOUN is **12/15**, not 15/15; Reading is **20/23**,
  not 23/23; and INTJ is **15/18**, not 18/18. All three actual artifacts still
  meet the 80% threshold. The summary prose should be corrected before final
  handoff.
- The five current-policy artifacts retain `transport: "openai-batch-v1"`,
  Batch and file IDs, request counts, input/output JSONL hashes, the endpoint,
  and the 24-hour completion window. Their timestamps are the Batch job's
  created/completed wall-clock times; they do not claim per-request latency.
  Aphorism, Fusion, and PairedFrame came from one 100-request Batch;
  Collocation came from a later 40-request Batch; and the final Idiom evidence
  came from a 20-request Batch. Every cited Batch reports zero failed requests.
- The other 19 retained passing artifacts use the historical model/reasoning
  policy. This mixed-policy evidence set is explicit review context, not a
  claim that those older prompts have been rerun under Luna/none.
- This index establishes laboratory prompt evidence only. Catalog/runtime
  integration is owned by issue #54 and is deliberately outside this audit.

## Deterministic audit basis

The audit imported each current Prompt Source and Evaluation Selection, counted
Golden Cases, demonstrations, and held-outs, and checked selection disjointness.
It also read every retained artifact's own `contractScore`, `scoreRatio`,
`executionErrorCount`, `unclassifiedMissCount`, `finalizedAt`, and
`evidenceThresholdMet` fields. Generated-prompt freshness, type checks, and the
route test suite remain the executable verification surface; this evidence
index deliberately adds no second manifest that could drift from the Prompt
Sources.

Verification on 2026-08-03:

- the structural audit imported all 24 current Prompt Sources and runner
  selections (722 Golden Cases, 115 demonstrations, and 460 held-outs) and
  passed every held-out-count, selection-uniqueness, selection-disjointness,
  and demo-smaller-than-evaluation assertion;
- the artifact audit validated 24 finalized threshold artifacts, with zero
  execution errors and zero unclassified misses; every scored miss has a
  resolving sidecar entry (54 classified misses total), and all five Batch
  artifacts passed their retained transport-provenance checks;
- the full Dumgen suite passed 380 tests across 54 files with zero failures;
- all 47 local links in this index resolve, and `git diff --check` passes.
