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

Three more questions ride the same call (2026-09-20). `identity.ts` selects a
closed-class word's authored identity from the candidates its spelling
enumerates (`--identity`), `roles.ts` names each member's role and projects
the lexical shape in code (`--roles`), and `shapes.ts` moves the rules out of
state and into the questions (`--shape questions`). `gold.ts` turns the lemma
gold and the verb and noun gold into sentences so they score like the click
corpus (`--corpus lemma|grammar`).

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
    zsh -ic 'export TYPESAFE_API_KEY=$TYPESAFE_TOKEN; bun prototypes/intake/lab.ts --grouping anchored --route extended --route-policy groupVote --threshold 0.6 --corpus lemma --identity --runs 2'
    zsh -ic 'export TYPESAFE_API_KEY=$TYPESAFE_TOKEN; bun prototypes/intake/lab.ts --grouping anchored --route extended --route-policy groupVote --threshold 0.6 --corpus grammar --roles --runs 2'
    zsh -ic 'export TYPESAFE_API_KEY=$TYPESAFE_TOKEN; bun prototypes/intake/lab.ts --grouping anchored --route extended --route-policy groupVote --threshold 0.6 --shape questions --concurrency 3 --runs 2'
    zsh -ic 'export TYPESAFE_API_KEY=$TYPESAFE_TOKEN; bun prototypes/intake/lab.ts --grouping anchored --route extended --route-policy groupVote --threshold 0.6 --corpus lemma --identity --identity-shape rubric --runs 2'
    zsh -ic 'export TYPESAFE_API_KEY=$TYPESAFE_TOKEN; bun prototypes/intake/fixtures.ts'

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

## Identity from authored candidates (2026-09-20)

`anchored` + `extended` + `groupVote`, τ 0.6, plus one Choice per occurrence
whose spelling enumerates authored DET, PRON or AUX members (mean 4.5 options,
max 23), each option a rubric of Kind, headword, cell and definition, plus
NoMatch and Unresolved. Two runs on the 212 lemma-gold evaluation sentences
(167 PRON, 32 DET, 13 AUX) and two on the 91 click sentences.

| | exact identity | headword and Kind only |
| --- | --- | --- |
| PRON (167) | 113, 117 | 142, 144 |
| DET (32) | 26, 26 | 26, 26 |
| AUX (13) | 10, 11 | 10, 11 |
| all (212) | **149, 154** | **178, 181** |

The headword is right 85% of the time; the cell is what fails. 27-29 PRON
cases pick the right headword in the wrong case, number or gender (`die`
Nom for Acc, `keine` Plur for Sing Fem, `dessen` with or without `extPos`
DET), 14-16 pick the DET twin of a standalone form (`keiner`, `mancher`,
`jeglicher`), 6 are genitive paradigm holes where gold is Unresolved and the
judge picks the DET, 2-3 subjunctive auxiliaries (`sei`, `wären`, `hätte`)
answer NoMatch, and 3 are Misses: two typos (`ihc`, `disem`) and `des`, because
only `der`, `die`, `das` are authored article spellings (articles are Derived
under ADR 0024). Run-to-run spread is 5 cases.

Identity implies route better than the route vote does. On the 190 DET and
PRON gold clicks the selected identity's Kind matches gold 165 times; the route
vote on the same run is right 136 times, and 26 of its errors are PRON routed
DET. On the 210 classification clicks the identity axis changes nothing
(165, 168 pass against 165, 166 without it, +2.1 questions and +1.1k input
tokens per sentence); every selected identity on a closed-class gold click
agrees with gold (PRON 6, DET 2), and every DET inside a NOUN unit (14), AUX
inside a VERB unit (28) and `es` inside a VERB unit (8) is the structural
non-head case. Kind disagreement with the unit's route: 3 of 155 selected
occurrences on the click sentences, 54-55 of about 485 on the lemma
sentences, dominated by PRON against DET (23-26) and PRON inside a VERB
singleton (12-14).

Miss rate, occurrences the vote routed DET or PRON with no candidate: 1-2 of
66 on the click sentences (`freien`, `des`), 9-11 of about 320 on the lemma
sentences (typos, foreign `the` and `he`, and open words the vote routed
closed: `plan`, `mit`, `nächsten`, `versprechen`, `glaubte`). What the
realization table lacks for this use is `den`, `dem`, `des`.

## Member roles and the projected shape (2026-09-20)

Same design plus one Choice per occurrence over Head, SeparableParticle,
GovernedPreposition, Reflexive, Expletive, Article, Auxiliary, Free and
Unresolved. The shape of the unit around each gold head is projected from the
roles of the members the matrix grouped with it and scored against the 77 verb
and 43 noun evaluation cases, two runs.

| feature | correct | gold present, projected |
| --- | --- | --- |
| lexicallyReflexive | 77, 77 of 77 | 10, 10 of 10 |
| expletive | 77, 77 of 77 | 6, 6 of 6 |
| hasGovPrep | 71, 72 of 77 | 9, 10 of 14 |
| hasSepPrefix | 68, 68 of 77 | 2, 2 of 11 |
| article (noun) | 28, 29 of 43 | 22, 23 of 35 |

All five features right on 92-93 of 120 units. `hasSepPrefix` cannot come
from roles: 8 of the 11 gold prefixes are bound inside a participle or
zu-infinitive (`mitgebracht`, `hinauszulaufen`, `angekündigt`), and of the
three separated particles two were projected. The article splits by source:
owned 22-23 of 29, fused (`im`, `zum`, `ins`, `zur`) 0 of 5 until the ADR 0004
Segment split exists, shared 0 of 1, and two bare plurals (`beide Knie`, `drei
Mädchen`) were given an article. The genitive misses (`des Mannes`, `der
Frauen`) are membership misses, not role misses: the article was never grouped.

Role against membership: 216-229 of 852 role answers name a unit the matrix
did not build, but 155-157 of them are `Head` on a singleton, where the rubric
asked for `Free`; the judge prefers Head for a word that stands alone, so the
two options should be one. The remaining 7% are real: `Free` inside a group
(23-28), `Article` (22-26) and `GovernedPreposition` (13-14) on singletons.
11-13 multi-member units got two heads, 4-8 none. Asking roles does not
change the membership answers: 165, 170 clicks pass with roles against 165,
166 without, +5.4 questions and +2.4k input tokens per sentence.

## Rules in the questions instead of the state (2026-09-20)

Same design, `state` shape (the 900-word `targetCriteria` in state, every
question says "under `criteria`") against `questions` shape (state is the
tagged sentence only; the membership rules are the membership question's
structured instructions, the route rules are structured option descriptions).
Two runs each on the 210 clicks.

| shape | pass | route ok | members ok | calls / sentence | input tokens / sentence | p50 | p90 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `state` | **165, 166** | 195, 196 | 165, 166 | 1.04 | 9342 | 373, 359 ms | 983, 594 ms |
| `questions` | 152, 144 | 189, 189 | 157, 150 | 1.85 | 41526 | 472, 435 ms | 1645, 1396 ms |

The membership rules ride in every one of the n² membership questions, so the
request grows four and a half times, needs 30-question chunks to stay under
the request budget (80 per call hit `max_tokens_exceeded`), and still loses
about fifteen clicks with twice the run-to-run spread. The spec keeps the
criteria in state.

## Auxiliary identity derived from shape (2026-09-21)

`derive-aux.ts` asks whether a non-head auxiliary member needs an identity
distribution at all. It takes the members of every verb gold target and the
sentence of every AUX gold case, reads the auxiliary's lemma, the head's form
and the other auxiliaries, and derives the serving AUX Reading plus the
target's perfect, future, passive and voice features. No jev call.

    bun prototypes/intake/derive-aux.ts

| Gold | Cases | Derived right | Lexical fork | Wrong |
| --- | --- | --- | --- | --- |
| verb targets with an auxiliary | 22 | 21 | 1 | 0 |
| AUX corpus (serving Reading) | 18 | 18 | 0 | 0 |

The rules: `bekommen`/`kriegen`/`erhalten` with a participle is the recipient
passive; `worden`, preterite `werden` or `werden` with a participle is the
process passive; present `werden` with an infinitive is the future, `würde` the
Konjunktiv II periphrasis; `haben` is perfect, or obligation with `zu`; `sein`
is perfect when `worden`, `gewesen` or `geworden` is in the target, the modal
passive with `zu`, and the Verlaufsform with `am`.

The one fork the shape cannot close is `sein` plus a participle with no
`worden`: `ist geschlossen` (state passive) against `ist gegangen` (perfect).
It is lexical, whether the verb takes `sein` as its perfect auxiliary, so it
belongs on the verb's Lemma or in the grammar step's existing `passive`
Choice, not in a per-member distribution. The head's own form (participle,
infinitive, zu-infinitive) is a grammar feature already; the script reads it
off the spelling with a heuristic.

So for #493: identity needs a distribution in one place, a closed-class head,
and it lives on the target. Auxiliary and article members carry a role only.
Roles were 100% for reflexive and expletive and projectable for the rest in
the roles axis, so they persist as values with Unresolved, not as masses.

## Identity candidates: headword groups or per-cell with a rubric (2026-09-21)

Issue 509. Same design, `--identity-shape` on the 212 lemma-gold sentences,
two runs each, plus one same-day run of the #489 shape (`authored`: one
option per member, the cell as bare feature pairs). `headword` collapses the
options to Kind, headword and pronType; `rubric` keeps one option per member
and describes the cell in the syntactic terms the sentence shows (which
object, which preposition, which agreement).

| shape | exact Lemma | headword and Kind | PRON (167) | DET (32) | AUX (13) | options / question | input tokens / sentence | wrong cell only | DET twin | genitive hole |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `authored` | 154 | 178 | 141 | 26 | 11 | 4.25 | 12.4k | 24 | 21 | 6 |
| `headword` | 177, 177 | 179, 180 | 143, 143 | 28, 28 | 8, 9 | 2.03 | 12.0k | 2, 3 | 16, 15 | 6, 6 |
| `rubric` | 161, 162 | **186, 186** | **149, 149** | 26, 26 | 11, 11 | 4.25 | 13.0k | 25, 24 | 13, 14 | 6, 6 |

"Exact" for `headword` counts a group that contains the gold member, so it
equals its headword score minus the DET-twin and NoMatch errors; the cell is
not asked. Run-to-run spread is 4 cases.

What moves and what does not:

- The rubric lifts headword and Kind by 8 over the bare features, above the
  spread, and every gain is PRON: the syntactic cell description separates a
  standalone form from its DET twin (21 to 13). It does not fix the cell:
  24-25 selections still name the right headword in the wrong case, number or
  gender, the same as without the rubric. The cell stays a grammar question.
- Headword groups halve the options and match the bare-feature shape on
  headword accuracy, but the AUX groups lose 2-3 cases: one rubric per Lemma
  hides the per-use Readings (`sei`, `wären` answer NoMatch). Under #493 AUX
  is never a target and its Reading derives from shape, so this costs nothing
  in production, but it says a group rubric must describe the whole group.
- Summing per-cell mass by headword group before the argmax changes 0-2
  cases against taking the winning member's group (186 → 187, 186 → 186,
  178 → 180). So the Choice can keep per-cell rubric options and the stored
  mass can still be keyed by headword group.
- Neither shape closes the genitive holes: all 6 gold-Unresolved cases get a
  DET selected. That is a candidate-list problem (the hole is not an option),
  not a rubric problem.

Recommendation: options as per-cell rubrics, mass stored per headword group
(`Kind:headword:pronType`), cell to the grammar step. `fixtures.ts` emits
that shape.

## Playground fixtures (2026-09-21)

`fixtures.ts` runs the 16 sentences in `fixtures/sentences.ts` through the
winning design plus the identity and role axes, splits fused words and
expands abbreviations with the German fusion table, and writes
`fixtures/lattice.json`: Segmented Sentences as #493 defined them (offsets,
members with roles, one Route Mass, an Identity Mass over headword groups)
with their gold keyed by offset. `segmented-sentence.ts` holds the DTO and
the Resolution Selector; the tf-demo playground entry `lattice` imports both
and renders nothing the selector did not derive.

Scored against the authored gold, one run:

| | gold targets | members found | route correct | roles | identity |
| --- | --- | --- | --- | --- | --- |
| 16 sentences | 77 | 67 | 60 | 26 of 26 | 12 of 12 |

The ten membership misses are the things the playground exists to show: the
idiom `den Faden verloren` split into a verb and a noun phrase, `auf dem
Markt` grouped whole, `geht's dir` grouped whole, the Funktionsverbgefüge
`zur Verfügung stellen` taking `Material` and `den Schülern` with it, and a
fused `m` in `am Montag` left unattached because `Montag` was voted PROPN.
`usw.` was routed X, `früh` and `spät` ADV against gold ADJ.

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
- Identity selection fails on the cell, not the headword (measured on #509:
  a cell rubric helps the headword, not the cell). The cell stays a grammar
  question; the stored mass is keyed by headword group.
- `hasSepPrefix` and the fused article stay grammar questions; the Segment
  split of ADR 0004 is what would let the fused article become a role.
