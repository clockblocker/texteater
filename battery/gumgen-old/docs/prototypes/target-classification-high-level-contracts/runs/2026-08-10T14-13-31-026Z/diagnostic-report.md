# Diagnostic pool report

This non-winner-eligible run evaluated only the 34-case diagnostic pool: the 14
unique failures from the best v9 development run plus 20 controlled analogues.
Each case ran twice, for 68 logical calls. The frozen 94-case development
selection was not changed or scheduled.

- Model: `gpt-5.6-luna`
- Provider errors: 0
- Attempt scores: 21/34 and 18/34
- Total: 39/68
- Retained billed-cost upper bound: $0.02274836

## Cluster breakdown

| Cluster | Source | Passed | Failed | Total |
| --- | --- | ---: | ---: | ---: |
| Fusion | prior failure | 1 | 1 | 2 |
| Fusion | analogue | 0 | 2 | 2 |
| Paired-frame fillers | prior failures | 0 | 4 | 4 |
| Paired-frame fillers | analogues | 3 | 5 | 8 |
| Idiom membership | prior failures | 8 | 2 | 10 |
| Idiom membership | analogues | 1 | 9 | 10 |
| Optional reflexive | prior failure | 2 | 0 | 2 |
| Optional reflexive | analogues | 4 | 0 | 4 |
| Copula POS | prior failure | 2 | 0 | 2 |
| Copula POS | analogue | 0 | 2 | 2 |
| Separable/positional identity | prior failures | 4 | 4 | 8 |
| Separable/positional identity | analogues | 14 | 0 | 14 |

The original cases passed 9/14 and 8/14 by attempt; analogues passed 12/20 and
10/20. The similar aggregate rates show that the diagnostic pool is difficult
without merely replaying the old misses, while the cluster split identifies
which failures generalize.

## Interpretation

- Paired-frame filler absorption is systematic for `je … desto`: all eight
  original and analogue comparative-filler calls failed. `entweder … oder`
  fillers passed three of four, so the defect is not a universal PairedFrame
  rule failure.
- Free modifier absorption inside idioms transfers strongly. Every click on
  `Öl ins Feuer gießen` absorbed `zusätzliches`; the modifier click itself was
  correct once and absorbed by the idiom once. The older wolf idiom was much
  more stable, suggesting demonstration-item familiarity rather than a robust
  membership algorithm.
- Fusion routing transfers: `am` was called `Lexeme/ADP` twice, while the old
  `zum` case passed once and once incorrectly absorbed the following noun.
- Optional reflexives are now stable: all six calls split the verb and pronoun
  correctly.
- Separable-verb position logic is generally stable on new forms: all 14
  analogue calls passed. The repeated `steht … auf` and original overlap case
  still failed twice each, so those are stimulus-specific residuals rather than
  evidence of a broad separable-verb failure.
- Copula labeling is lexeme-specific: `ist` passed twice, while predicative
  `bleibt` was labeled `VERB` twice instead of the target policy's `AUX`.

These results support concentrating the next prompt revision on three narrow
mechanisms: `je … desto` filler exclusion, free-modifier exclusion from idiom
membership, and fused-form routing. Optional reflexive and generic
separable-position guidance should not receive more demonstrations.

## Blind follow-up

A later neutral, non-scoring follow-up audited all 29 misses plus one passing
control from each of the six mechanism clusters. All 35 calls parsed without a
provider or model-output error. The model said it would revise 10 answers, but
none of its proposed compact classifications exactly matched the oracle. It
also tried to revise three of six passing controls.

The explanations frequently named the right abstract distinction—such as free
PairedFrame fillers or optional idiom modifiers—while the proposed target still
absorbed the filler/modifier or rebuilt `additionalMemberCompactIndices`
incorrectly. This supports an action/serialization defect rather than a mere
lack of grammatical vocabulary. Follow-up artifacts remain excluded from the
first-turn score and winner policy.
