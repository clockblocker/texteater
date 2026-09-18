# Click-path pipeline prototypes (2026-09-18)

Live jev experiments answering: how many System One round trips does one click
really need, and what does folding them cost in accuracy?

Run with the login shell so `TYPESAFE_TOKEN` is exported:

    zsh -ic 'export TYPESAFE_API_KEY=$TYPESAFE_TOKEN; bun prototypes/p1-classify-one-call.ts eval'
    zsh -ic 'export TYPESAFE_API_KEY=$TYPESAFE_TOKEN; bun prototypes/p2-intake-precompute.ts eval'
    zsh -ic 'export TYPESAFE_API_KEY=$TYPESAFE_TOKEN; bun prototypes/p3-noun-one-call.ts fold'       # or head-only

Baselines were produced with the production CLI on the same evaluation sets:

    bun cli/evaluate.ts --experiment target-classification/de/high-level-whole-unit --revision <rev> --judgment-timeout 30000
    bun cli/evaluate.ts --experiment grammatical-resolution/de/lexeme/noun --revision <rev> --judgment-timeout 30000

## Results

Classification, 182 evaluation cases (`evaluation-ids.ts` minus demonstrations):

| design | pass | jev calls / click | p50 sequential jev latency |
| --- | --- | --- | --- |
| production (membership, then whole-target) | 124 | 1.65 | 600 ms |
| P1 one call (membership + unitRoute), run 1 | 119 (121 with singleton policy) | 1.0 | 318 ms |
| P1 one call, run 2 | 124 (125 with singleton policy) | 1.0 | 317 ms |
| P2 intake precompute (per-token leftmost-member link + route), zero click-time calls | 100 | 0.46 per click (1 per sentence) | 0 ms at click |

Route-only and membership-only correctness on the same 182 clicks:

| design | route correct | members correct |
| --- | --- | --- |
| production | 150 | 126 |
| P1 | 158 | 123 |
| P2 | 161 | 105 |

Run-to-run noise of the same P1 questions: 14 clicks flip each way between two runs.
Membership is the accuracy bottleneck in every design; the route of the unit
containing the click is judged better when asked directly than when asked
about the assembled group.

Noun grammar, 44 evaluation cases:

| design | pass | jev calls / case | p50 sequential jev latency |
| --- | --- | --- | --- |
| production (features, then article, then case when ambiguous) | 24 | 2.27 | 729 ms |
| P3 fold (article attachment + speculative Case appended to the features call) | 26 | 1.0 | 321 ms |
| P3 head-only (same, but only the noun head marked as the target) | 25 | 1.0 | 332 ms |

P3 loses no baseline case. Head-only shows the noun feature judgments do not
need the article marked as a member.

Per-call latency is flat in question count (features with 12 questions 363 ms,
article with 1 question 309 ms). Round trips, not questions, cost time.

## Design A implemented (2026-09-18, live runs from the built dist)

| experiment | before pass | after pass | jev calls / case before → after | p50 before → after |
| --- | --- | --- | --- | --- |
| target-classification (182) | 124 | 118 | 1.65 → 1.00 | 600 ms → 305 ms |
| noun grammar (44) | 24 | 25 | 2.27 → 1.09 | 729 ms → 330 ms |
| verb grammar (51) | 22 | 22 | 1.80 → 1.49 (lexical-strings follow-ups 15 → 1) | 1046 ms → 341 ms |

The classification delta is inside the measured run-to-run noise of the same
questions (119 and 124 on consecutive identical runs). Verb p50 includes Luna
canonical-form generation, which is now the dominant remaining cost on that route.
The verb baseline needed the evaluation projection fix in `src/evaluation/grammar-operation.ts`
(expletiveEvidence was dropped, so every verb case failed the output schema).

Note: `cli/evaluate.ts` evaluates the built `dist`, so run `bun run build:js` before evaluating source changes.

## P4: stray articles on noun clicks (2026-09-18)

Live traces (`resolution_inspector trace p97562n0ccz21jxdhedxhvace18em5yt`, `…p9779dzqs7a0nth68zdfk9y2es8em33n`)
showed the membership judge attaching every definite article in the sentence to a
clicked noun: a click on `Weg` in `… sagte die Wanderführerin: „Der Weg ist das Ziel.“`
assembled `[die, Der, Weg, das]` NOUN with Include probabilities 0.75–0.86, and the
grammar stage's `support` question then failed the request as
`Unresolved applicable question support`.

Changes measured here:

- `targetCriteria` gained one sentence: a noun absorbs at most one article, the one
  opening its own phrase; articles across a verb, clause boundary or another noun never join.
- `assembleTarget` (new `target-classification/assembly.ts`, shared by production and
  this prototype) rejects a NOUN assembly with more than one article member, or one
  that is not the leftmost member, before the grammar stage runs.
- 24 golden cases `target-de-noun-article-cross-*` (four sentences with several
  articles across clauses, every noun and article click), listed in `evaluation-ids.ts`.

    zsh -ic 'export TYPESAFE_API_KEY=$TYPESAFE_TOKEN; bun prototypes/p4-noun-article-membership.ts eval'

| variant | legacy 182 pass | new 24 pass | stray article assemblies (206) |
| --- | --- | --- | --- |
| head (wording before the change) | 117 | 17 | 7 |
| tightened (current wording) | 124 | 21 | 4 |
| owned (tightened + one `ownedArticle` choice feeding NOUN article membership) | 119 | 21 | 3 |

On the 32-case article subset, two runs each: head 23/23, tightened 25/26, owned 27/25.
The tightened wording keeps the production baseline on the legacy set (124, same as
the pre-Design-A production number) and removes the stray-article assemblies on noun
routes; the remaining "stray" rows are idiom/verb membership errors, not article ones.
The extra `ownedArticle` question buys nothing over the wording and costs legacy
cases, so it is not adopted.

Consistent remaining failures in the new cases are article clicks, not noun clicks:
clicking `dem`/`der`/`des` returns the article alone as NOUN or DET, or `des` as
Fusion. That is a separate weakness of the article-click rule and is left open.
