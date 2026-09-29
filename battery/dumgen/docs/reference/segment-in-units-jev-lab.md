# German `segment.inUnits` with jev: lab results (2026-09-29)

This lab tests what jev (`jev-latest` = `jev-1.13.0`) can do for German
`segment.inUnits` (Dumgen ADR 0007): grouping a Sentence's pieces into
biggest units and routing each unit. It also measures cost and stability.
The code is not the production segmenter. Ticket: #744 on the #701 map.

- Code: `src/segment-in-units/de/` holds the arms, candidate generators,
  guide and routes. `src/segment-in-units/lab/` holds the frozen sets, the
  cached jev and Luna clients, metrics, the promptsmith export and the
  ledger. The CLI is `cli/segment-in-units-lab.ts`.
- The lab imports only the #731 harness (`src/evaluation/spec-corpus/`),
  promptsmith and dumspec, so it runs while Dumgen is red. Typecheck it
  with `bun run check:segment-in-units`; its tests are in
  `tests/segment-in-units/`.
- Evidence: `evidence/segment-in-units-lab/ledger.jsonl` records the fresh
  spend of every command, and `summaries/` holds one JSON file per run with
  policies, cost, breakdowns and calibration. Raw answers, runs and frozen
  sets are in `.runs/segment-in-units-lab/`, which is gitignored.

```sh
bun run segment-in-units-lab freeze                      # once; --force refreezes
bun run segment-in-units-lab run --arm candidates2 --subset slice300 --reps 3 \
  --opt routes=question --opt tests=1 --opt gen=3
bun run segment-in-units-lab report --run <runId> [--policy <p>] [--subset <s>]
bun run segment-in-units-lab compare --left <runId>:<policy> --right <runId>:<policy>
bun run segment-in-units-lab limit-qpc --limit 12 --sizes 25,100,400,1000
bun run segment-in-units-lab ledger
```

## Data and scoring

- `dev` is Draft minus the excluded records: 1207 cases, 1773 scored gold
  units, 47 Full records. Hash `90c1afa7a4df706d`, frozen at `c7176459`
  with no uncommitted record files. `slice300` is every Full dev case plus
  127 cases with a multi-piece gold unit and 126 others, for 873 scored
  units. All tuning used dev.
- `heldout` is Reviewed: 98 cases, 148 scored units, 3 Full records. Hash
  `3d864ba243a7e7a0`. Only finalists ran on it.
- Scoring uses the #731 evaluator. **unit%** counts Match. **seg%** counts
  Match plus WrongRoute (the right Segments). **multi seg%** is seg% over
  gold units of two or more pieces. **Full** is the share of Full records
  that pass the sentence check. `Unresolved` and Foreign gold units are
  Stub and unscored until #730.
- Every arm ran 3 repetitions, and rates are summed over them. **flips**
  counts cases whose contract verdict differs between repetitions.
  Token and latency figures are per sentence. Latency is modelled as the
  sum over sequential requests.
- An arm returns one output per assembly policy from the same answers, so
  threshold sweeps cost nothing. Each table row shows the arm's best
  policy.

## Results

Dev slice (`slice300`, 3 repetitions):

| arm (policy) | unit% | seg% | multi seg% | Full | flips/294 | jev tokens | p50 / p95 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| gold grouping + jev route (`routes=question tests=1`) | 93.0 | 100 | 100 | 51% | 8 | 6.8k | 0.30 / 0.41 s |
| **candidates v3** (`gen=3 routes=question tests=1`, `full@0.7+family`) | **85.4** | 90.0 | 76.2 | 35% | 7 | 11.2k | 0.62 / 0.99 s |
| candidates v3 + full Rules in the route request | 86.1 | 90.0 | 76.2 | 35% | 4 | 18.4k | 0.67 / 1.07 s |
| candidates v3 with pieces tagged inline | 85.3 | 90.1 | 73.8 | 38% | 7 | 10.8k | |
| candidates v3 with no unit guide in state | 78.8 | 83.3 | 72.1 | 28% | 12 | 10.2k | |
| candidates v2 (`routes=state`) | 83.8 | 89.5 | 74.9 | 29% | 4 | 8.8k | 0.61 / 0.98 s |
| candidates v1 (`sat0.6+expr0.5`) | 81.9 | 86.9 | 64.1 | 30% | 7 | 7.9k | 0.61 / 0.97 s |
| Luna (low effort) + jev veto at 0.5, Luna routes | 78.7 | 83.2 | 51.3 | 26% | 26 | 5.9k + Luna | 1.6 / 3.9 s |
| pairwise Noul (`t0.8`) | 77.1 | 82.0 | 47.0 | 23% | 12 | 10.9k | 0.59 / 0.80 s |
| Luna alone (low effort) | 76.7 | 81.8 | 58.8 | 24% | 28 | Luna 1.7k in / 0.15k out | 1.6 / 3.9 s |
| anchored membership Choice, legacy (`t0.8`) | 76.2 | 81.3 | 48.6 | 20% | 11 | 23.6k | 0.63 / 0.93 s |
| attachment Choice (`t0.8`; `argmax` 50.4) | 71.9 | 77.0 | 46.0 | 13% | 11 | 8.8k | 0.58 / 0.74 s |
| Luna alone (no reasoning, Dumgen's default) | 68.7 | 74.1 | 50.6 | 18% | 33 | Luna 1.7k / 0.1k | 1.7 / 2.6 s |
| every piece alone + jev route (floor) | 67.1 | 71.7 | 0 | 6% | 2 | 3.9k | 0.29 / 0.37 s |

Full dev (1207 cases), candidates v3 `full@0.7+family`: **81.8** unit%,
88.5 seg%, 73.4 multi seg%, 35% Full, 29 of 1166 cases flip, 9.8k jev
tokens ($0.00041) per sentence, 2.2 requests, p50 0.60 s, p95 0.96 s.
The other arms ran on the slice only, to stay within budget.

Held-out (Reviewed, 98 cases):

| arm (policy) | unit% | seg% | multi seg% | Full (of 3) | flips/98 | jev tokens |
| --- | --- | --- | --- | --- | --- | --- |
| gold grouping + jev route | 92.8 | 100 | 100 | 1 | 2 | 5.4k |
| **candidates v3** (`full@0.7+family`) | **87.8** | 92.1 | 85.5 | 1 | 1 | 8.4k |
| candidates v3 + full Rules in the route request | 87.4 | 92.1 | 85.5 | 1 | 3 | 15.6k |
| Luna (low effort) + jev veto at 0.5, Luna routes | 81.5 | 86.7 | 68.6 | 0 | 7 | 5.1k + Luna |
| Luna alone (low effort) | 78.8 | 84.0 | 73.6 | 0 | 7 | Luna 1.7k / 0.09k |
| pairwise Noul (`t0.8`) | 77.7 | 83.6 | 64.8 | 0 | 6 | 7.3k |
| every piece alone + jev route | 58.8 | 64.2 | 0 | 0 | 1 | 3.3k |

Cost ledger: jev fresh input 188.6M tokens, **$7.92** of the $10 budget.
Luna: 2106 fresh calls, 3.55M input and 0.25M output tokens.

## The designs

- **Candidates** (`candidates`, `candidates2`): code proposes and jev picks.
  Code finds every piece that may attach to another word: articles
  (including fused pieces), separable particles, auxiliaries (dumspec AUX
  spellings), reflexives, expletive es, and governed prepositions (dumspec
  ADP Case Table). For each one, jev chooses the host among a bounded window
  of pieces, or `none`. Code also proposes split adverbs, correlators,
  circumpositions, `X dass` subordinators, multiword names and superlative
  `am`, and jev confirms each with a Noul. Expressions come from a
  fixedness Noul per piece, pair Nouls among the fixed pieces, a host
  Choice per noun for idioms and support-verb collocations, and a Noul per
  candidate Saying span (the sentence, quoted stretches, clauses and
  adjacent clause pairs), taking the most probable span first. Inside an
  expression, code adds the other pieces of a split word and the
  preposition that opens a member noun's phrase. `+family` lets code name
  the Family from how the unit was built (satellite links only: Lexeme; an
  expression link: Locution; a Saying span: Saying), and jev names only
  the Kind within it.
- **Pairwise / anchored**: one Noul per unordered pair, or a membership
  Choice per ordered pair averaged over both directions. Code takes
  connected components above a threshold.
- **Attachment**: one Choice per piece over the other pieces or `none`.
- **Luna**: gpt-5.6-luna returns units with routes as structured output.
  jev then verifies each multi-piece unit and member and routes every unit.
- **Routes**: one Choice per unit over the German routes. A one-piece unit
  only sees Lexeme Kinds and Foreign. A spelling that realizes authored
  DET or PRON members also asks an identity Choice among those candidates
  (ADR 0007). `tests=1` adds the Rule tests below.

## What jev can and cannot do here

1. **jev decides well when it chooses among options code has already
   bounded, and poorly when a judgment is open-ended.** Candidate hosts
   beat the pairwise and anchored designs by 8–9 points of unit% at
   similar or lower cost, and by 28–29 points of multi-piece seg%. Open pair membership is badly
   calibrated: pairwise pairs at 0.5–0.6 are truly linked 30% of the
   time, and at 0.95+ only 91%. Expression pairs asked only among pieces
   jev had already flagged as fixed are linked 61–73% of the time at
   0.5–0.6, and 97–100% at 0.8+.
2. **Routing is not the bottleneck.** With gold grouping, jev routes 93%
   of units. Describing the routes in the Choice criteria beats keeping
   the descriptions in state (paired +19 −1 units). Identity among the
   authored candidates adds 1.1 points, as ADR 0005 found. Every Rule
   statement in state adds 1.4 points (+23 −9), but a whole call costs 3×
   the tokens, so the lab puts the Rules only in the route request. Letting
   code choose the Family and jev the Kind adds 0.3–0.7 points.
3. **Grouping needs the unit guide.** Without the short guide in state,
   candidates v3 drops from 85.4 to 78.8 (paired −78 +21). Routing does
   not need it: 91.9 without the guide against 91.0 with it. Demonstrations
   in state add nothing (−8 +4).
4. **jev knows common Sayings but not literary aphorisms.** Shown candidate
   spans, it gives the exact quoted proverb 0.84–0.97. It rates Winged
   Words that are less well known low (*Die Güte, die nicht grenzenlos
   ist, …* 0.29, *Ein Aphorismus ist der letzte Ring …* 0.34). It reads the
   instruction "say no when the saying is only part of this wording"
   loosely: the whole sentence around a quoted proverb still scores
   0.5–0.8, so code has to take the most probable span first.
5. **Batch size does not change the answers.** Chunks of 25 to 741
   questions over the same state agree within repetition noise: mean |Δp|
   0.011, and 0.8% of decisions flip either way. Latency grows from 0.29 s
   (25 questions) to 0.67 s (741) and 1.2 s (1600). The hard limit is about
   64k input tokens per request, answered with HTTP 400
   `max_tokens_exceeded`: 1600 short Nouls (54k tokens) worked and 2000
   failed; 200 Choices over 28 routes without descriptions (58k) worked and
   312 failed. Output tokens are not limited, and 62k output passed. Small
   chunks cost about 1.6× the tokens, because the state is billed once per
   request.
6. **State size is not context rot at this scale.** Adding every Rule
   (about 7k tokens) helps routing. Adding 30 unrelated sentences on top
   changes nothing (+4 −4). The p50 latency is 0.34 s against 0.29 s
   with the short guide.
7. **Stability.** jev is not deterministic. Across repetitions, 0.8% of
   pair decisions and 1–4% of cases flip. Luna flips 9–11% of cases.
   Inline tags against the piece table give the same total but a different
   7% of units (+28 −33): the wording shifts individual answers.
8. **Calibration and an `Unresolved` line.** Route confidence tracks
   accuracy: 98.5% right at confidence ≥ 0.95 (61% of units), 88% at
   0.8–0.9, 72% at 0.5–0.6 and 56% at 0.4–0.5. On full dev, for correctly
   segmented units, calling everything below a floor `Unresolved` keeps
   94% of units at 93.9% accuracy (floor 0.5), 81% at 96.8% (0.8), or 70%
   at 98.1% (0.9), against 91.9% with no floor. Host-choice shares and
   fixedness Nouls are the other candidate signals and have not been swept.
9. **Luna is no ceiling here.** Without reasoning it barely beats the
   floor, because it over-groups (single pieces 78% right) and joins
   determiners to nouns. With low effort it reaches 76.7. jev verification
   adds 2 points on top of Luna, and the result stays below the candidate
   arms.

## What jev systematically fails

Full dev, candidates v3 `full@0.7+family`, unit% (seg%) per gold unit:

| phenomenon | units | unit% (seg%) |
| --- | --- | --- |
| Locution/ADV (*zum Teil*, *und so weiter*, *ein wenig*) | 84 | 29 (68) |
| Locution/ADP circumpositions (*von … an*, *an … vorbei*) | 24 | 38 (50) |
| Locution/INTJ (*ach je*, *ha ha*, *Pfui Teufel*) | 126 | 54 (59) |
| Saying | 216 | 55 (59) |
| Locution/VERB idioms and support-verb collocations | 219 | 56 (59) |
| governed preposition in a VERB unit | 105 | 53 (63) |
| one-piece PART (focus and modal particles) | 153 | 59 (98) |
| unit containing a fused piece | 189 | 65 (68) |
| particle verb split by ≥5 pieces | 39 | 67 (74) |
| particle verb split by <5 pieces | 75 | 71 (80) |
| VERB with required reflexive | 54 | 72 (72) |
| VERB with auxiliary | 108 | 79 (79) |
| one-piece ADJ (adverbial use) | 369 | 84 (97) |
| NOUN with article | 348 | 93 (93) |
| one-piece PRON | 924 | 97 (98) |

The most frequent route confusions: PART → ADV (42), CCONJ → ADV (21),
adverbially used ADJ → ADV (20), Locution/ADV → Lexeme/ADV (18). Causative
*lassen* is too rare in the corpus to measure.

The Rule tests help only partly. *Can this word inflect as an attributive
adjective* (Rule `de/adjective-stays-adj`) halves ADJ → ADV but creates
ADV → ADJ errors. *Does it modify a following noun* (Rule
`de/pron-or-det-by-use`) fixes standalone *jeglicher* and *ihr*. The net
gain is +0.3 points with gold grouping.

## Gold and Rule findings (not changed here)

- The Draft records disagree on focus and answer particles, which #734
  still has open: *nur* is PART in one record and ADV in two Full ones;
  *ja* and *doch* as answers are INTJ in some records and PART in others.
- *früh* and *ganz* are ADV in Draft Full records, while Rule
  `de/adjective-stays-adj` makes a word that inflects attributively an ADJ
  (routed to #734).
- Superlative `am` + adjective is ADV in *wer am längsten nicht examiniert
  worden war* but ADJ in *am frühesten*, *am sorgfältigsten*.
- Worth a look: *was mit ihm geschehen wird* gives `mit` to *geschehen* as
  a governed preposition, and *Es war gegen halb 12 Uhr* makes *Es war*
  one VERB with expletive es.

## Next

- Keep code proposing and jev picking. The weakest phenomena are
  multiword ADV, ADP and INTJ, where code proposes no span. They need
  candidate spans like the Saying spans (adjacent pairs and triples of
  function words for fixed adverbials; noun phrase + verb for idioms)
  instead of open fixedness pairs.
- Let code decide the Family everywhere, and give the Rule statements only
  to the route request.
- Set the `Unresolved` line from route confidence, somewhere in 0.5–0.8.
  Then sweep host-choice shares and fixedness Nouls the same way, once
  #730 scores `Unresolved`.
- Re-run the finalist on held-out as more records become Reviewed: 3 Full
  records cannot measure sentence passes.
