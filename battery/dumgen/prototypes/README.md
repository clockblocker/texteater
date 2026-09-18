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
