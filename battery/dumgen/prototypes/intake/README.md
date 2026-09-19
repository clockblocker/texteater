# Intake-first click pipeline (2026-09-18)

The click-path prototypes one directory up asked how few round trips *one
click* needs. These ask the opposite question: **how much of the work can move
into intake, so a click only has to run the steps that actually generate
something** (canonical form, Emoji Description, Knowledge texts) and those can
fan out in parallel.

Everything here is one jev call per sentence, at intake, with zero
classification round trips at click time.

## What is being chosen

A design is three independent decisions, so each is measured on its own and the
winners recombine. `lab.ts` runs the factorial; `designs.ts` holds the axes.

| Axis | Options | The question |
| --- | --- | --- |
| A grouping | `link` `head` `pairwise` `anchored` | how occurrences become one clickable thing |
| B routing | `flat` `extended` `hier` | how that thing gets its Family/Kind |
| C depth | `top` `lattice` | whether smaller units beneath it are produced too |
| route policy | `perOccurrence` `groupVote` `groupHead` | who owns the route once the group exists |

`grammar-batch.ts` is the separate fourth question: whether the grammar feature
judgments can ride along at intake as well.

## Scoring

The existing 206 target-classification evaluation cases are click cases, so a
sentence analysis is probed at each gold click and compared to `idealOutput`.
No new corpus is needed to compare designs. Only 9 of 292 corpus sentences have
every occurrence clicked, so alongside gold pass the report carries unsupervised
signal: occurrence coverage, the route inventory actually produced, and
`inconsistentMemberships` — how often two members of one predicted unit
disagree about their own unit, which the corpus criteria forbids and no
click-time design can even detect.

    zsh -ic 'export TYPESAFE_API_KEY=$TYPESAFE_TOKEN; bun prototypes/intake/lab.ts --grouping link,head,pairwise,anchored --route flat --sweep'
    zsh -ic 'export TYPESAFE_API_KEY=$TYPESAFE_TOKEN; bun prototypes/intake/lab.ts --grouping anchored --route flat,extended,hier --route-policy groupVote --threshold 0.6'
    zsh -ic 'export TYPESAFE_API_KEY=$TYPESAFE_TOKEN; bun prototypes/intake/lab.ts --grouping anchored --route extended --route-policy groupVote --threshold 0.6 --depth lattice'
    zsh -ic 'export TYPESAFE_API_KEY=$TYPESAFE_TOKEN; bun prototypes/intake/grammar-batch.ts --route noun --sizes 0,2,4,8'

Every run stores its raw answers under `/tmp/intake-*.json`. `--from <file>`
re-scores a stored run under a different threshold or route policy without
calling jev, which is how the threshold and route-policy grids below were
produced.

## The click-time baseline to beat

Re-run in the same session, on the same 206 cases, so the comparison is not
across model days: `p1-classify-one-call.ts` (the shipped Design A shape, one
call per click) scores **146 of 206**, 1.0 calls per click, p50 327 ms,
3465 input tokens per click.

## Axis A: how occurrences become a group

88 sentences, 479 occurrences, 206 gold clicks. Route `flat`, policy
`perOccurrence`, one call per sentence.

| grouping | pass | route ok | members ok | coverage | inconsistent | questions/sentence | p50/sentence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `link` (P2 leftmost member) | 110 | 177 | 118 | 0.98 | 271 | 10.9 | 331 ms |
| `head` (head of unit) | 106 | 144 | 110 | 0.89 | 146 | 10.9 | 334 ms |
| `pairwise` (Noul per pair) | 143 | 165 | 150 | 0.95 | 103 | 23.4 | 324 ms |
| `anchored` (membership matrix) | 146 | 182 | 153 | 0.99 | 92 | 41.3 | 356 ms |

Asking one occurrence to name its group's anchor — leftmost member or head —
loses about 35 cases against asking every pair and letting code build the
partition. Naming the head is no better than naming the leftmost member; the
anchor formulation is the problem, not the choice of anchor.

`anchored` asks production's own membership Choice from every anchor rather
than only the clicked one, then averages the two directions. It is the most
accurate and also the most expensive, and the gap to `pairwise` is small.

Threshold, swept offline over the same stored answers:

| τ | `pairwise` pass | `anchored` pass |
| --- | --- | --- |
| 0.4 | 129 | 127 |
| 0.5 | 143 | 146 |
| 0.6 | 144 | **157** |
| 0.7 | 140 | 146 |

## Route policy: who owns the Family/Kind

Connected components already guarantee one member list per group, but the route
was still asked per occurrence, so two members of one unit could disagree.
Summing each member's route probability mass and taking the argmax fixes that
for free — no extra questions, re-scored from stored answers.

| policy | pass | route ok | inconsistent |
| --- | --- | --- | --- |
| `perOccurrence` | 157 | 182 | 44 |
| `groupVote` | **162** | 184 | 0 |
| `groupHead` | 154 | 173 | 0 |

`anchored`, τ 0.6. `groupVote` is strictly better than both alternatives and
makes the partition self-consistent by construction.

## Axis B: route inventory

`anchored`, `groupVote`, τ 0.6.

| routing | pass | route ok | coverage | routes offered | grammar routes still unreachable |
| --- | --- | --- | --- | --- | --- |
| `flat` (production's 20) | 155 | 186 | 0.998 | 20 | 13 of 33 |
| `extended` (+Collocation, PUNCT, X) | **158** | 184 | 1.000 | 23 | 10 of 33 |
| `hier` (Family then Kind) | 88 | 107 | 0.762 | 23 | 10 of 33 |

Widening the flat inventory costs nothing and resolves every occurrence.
Splitting the judgment into a Family Choice plus a speculative Kind Choice —
the hierarchical-classification recipe — **fails badly here**: PRON collapses
from 54 to 15 occurrences and VERB inflates to 188. Family is not a judgment
jev makes well in isolation on this material; the Kind names carry the meaning.
Do not pursue it.

Collocation never fired on this corpus, which is consistent with `targetCriteria`
telling the judge that ordinary conventional combinations have no larger route.
Reaching Collocation needs a criteria change, not an inventory change.

## Axis C: the lattice

`anchored`, `extended`, `groupVote`, τ 0.6, plus four questions per occurrence
for the level below.

| | pass | gold found at some level | coverage | questions/sentence | p50/sentence |
| --- | --- | --- | --- | --- | --- |
| `top` | 158 | 158 | 1.000 | 41.3 | 355 ms |
| `lattice` | 159 | **164** | 1.000 | 63.1 | 446 ms |

The second level produced 227 sub-units the top level hides — 63 DET inside
noun phrases, 35 VERB inside auxiliary and idiom targets, 19 PART — and in five
gold cases the correct answer was the sub-unit rather than the top one. The
morpheme layer flagged 61 of 479 occurrences (13%) as having a bound morpheme
beyond inflection: 38 Prefix, 19 Suffix, 3 Interfix.

Neither the sub-unit level nor the morpheme level has gold cases. 13% feels low
for German, so treat the morpheme numbers as evidence that the signal is
producible at intake, not as a measured accuracy.

## Grammar features at intake

Production asks one target's feature questions with only that target marked.
If intake batches every unit in a sentence, several targets are marked at once.
`grammar-batch.ts` measures that contamination on the 44 noun evaluation cases:
`solo` is the production shape, `batchK` adds K decoy targets from the same
sentence and scores only the real one.

| decoy targets | all features correct | field accuracy | questions/call | input tokens | p50 |
| --- | --- | --- | --- | --- | --- |
| 0 (production shape) | 15 | 0.834 | 6 | 1545 | 358 ms |
| 2 | 22 | 0.880 | 30.8 | 6349 | 358 ms |
| 4 | 23 | 0.865 | 47.2 | 9477 | 384 ms |
| 8 | 23 | 0.869 | 51.1 | 10237 | 422 ms |

Batching does not degrade the scored target; it helps, plausibly because the
neighbouring marked targets make case and article context explicit. Latency is
flat.

These numbers are internal to this harness — it scores feature fields against
the corpus gold and does not run production's attestation projection, so the
`solo` column is not comparable to the 24/44 in the click-path README. The
comparison that matters is solo against batched, and batching wins.

## What intake costs

Per sentence, against 3465 input tokens for every single click today:

| design | input tokens / sentence | occurrences / sentence | break-even clicks |
| --- | --- | --- | --- |
| `anchored` + `extended`, top only | 9371 | 5.4 | 2.7 |
| `anchored` + `extended`, lattice | 15900 | 5.4 | 4.6 |
| `pairwise` + `extended`, top only | ~6400 | 5.4 | 1.8 |

A sentence read past its third clicked word already costs less at intake than
at click time, and the saving grows with every further click. A sentence nobody
clicks is pure loss, which is the argument for `pairwise` if intake is ever
applied to text the learner may not read.

## Where this leaves the pipeline

`anchored` + `extended` + `groupVote` + `lattice`, one call per sentence:
155-162 of 206 across four runs of the same design, against 146 for the
click-time baseline measured the same day. Every occurrence resolved, zero
classification calls at click time, and the level below the click already
computed. Run-to-run spread is about ±7, the same the click-path prototypes
measured, so the accuracy gain over click-time classification is real but
modest; the architectural gain is the whole point.

Open, in the order they block things:

- τ 0.6 was chosen on the set it is scored on. It needs a held-out split.
- The sub-unit and morpheme levels have no gold cases at all. Nothing about
  drill-down accuracy can be claimed until they do.
- `anchored` is O(n²) Choices. The 28-occurrence sentence needs 5 chunked calls;
  `pairwise` is half the questions for about 10 fewer cases. If intake latency
  ever matters, that is the trade to revisit.
- Collocation and the Morpheme routes stay unreachable until `targetCriteria`
  says what they are.
