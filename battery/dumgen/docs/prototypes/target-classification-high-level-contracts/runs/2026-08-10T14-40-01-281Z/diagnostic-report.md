# Revised-prompt diagnostic report

This non-winner-eligible run repeated the 34-case diagnostic selection after a
narrow prompt revision. The revision kept 27 demonstrations overall: it added
one frame-disjoint PairedFrame filler and one idiom/free-modifier example while
pruning two redundant demonstrations. The frozen 94-case development selection
was not scheduled or changed.

- Model: `gpt-5.6-luna`
- Provider errors: 0
- Attempt scores: 19/34 and 19/34
- Total: 38/68
- First-turn billed-cost upper bound: $0.02616310

## Before/after cluster comparison

| Cluster | Before | Revised | Change |
| --- | ---: | ---: | ---: |
| Fusion | 1/4 | 0/4 | -1 |
| Paired-frame fillers | 3/12 | 2/12 | -1 |
| Idiom membership | 9/20 | 15/20 | +6 |
| Optional reflexive | 6/6 | 6/6 | 0 |
| Copula POS | 2/4 | 2/4 | 0 |
| Separable/positional identity | 18/22 | 13/22 | -5 |
| **Total** | **39/68** | **38/68** | **-1** |

The idiom/free-modifier intervention transferred: all ten older idiom calls
passed, and the new `Öl ins Feuer gießen` analogues rose from 1/10 to 5/10.
PairedFrame filler exclusion did not transfer to `je … desto` or reliably to
`entweder … oder`. Fusion routing remained wrong on every call. The lower
separable score occurred outside the targeted change and is consistent with
substantial attempt variance in this difficult pool.

## Blind follow-up

The follow-up selected all 30 misses plus five available passing cluster
controls. Two initial HTTP 520 errors recovered on checkpointed resume, for 37
physical dispatches and 35 parsed artifacts. Its retained billed-cost upper
bound is $0.01442153.

- The model proposed revisions for 10/30 misses and 2/5 passing controls.
- Only 2/12 proposed corrections exactly matched the compact oracle.
- The two exact self-corrections were the original repeated-overlap separable
  case and the `entweder … oder` click on free filler `Kaffee`.
- Most PairedFrame and idiom explanations could state that fillers/modifiers
  were free, yet their corrected target still grouped them or mishandled the
  clicked-index exclusion contract.

The revised prompt therefore produced a real local gain for idiom membership,
but no overall quality gain. More generic wording or demonstrations are not
justified by this evidence. Any next intervention should isolate the
PairedFrame action rule and the compact membership encoding rather than further
expanding the general prompt.
