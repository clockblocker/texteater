# Learner Meaning resolution prompt experiments

Status: completed negative prototype for
[`clockblocker/texteater#8`](https://github.com/clockblocker/texteater/issues/8).
The experiment identifies the strongest tested candidate presentation, but
**no tested arm is eligible for production**. It does not change the dumgen or
dumling runtime.

## Question and fixed contract

The experiment asks how a contextual use of an already-resolved opaque
Linguistic Entry should either reuse one of that learner's existing Meanings or
draft a genuinely note-worthy new Meaning.

The normative inputs and gate come from the
[#5 corpus](https://github.com/clockblocker/texteater/issues/5#issuecomment-5140070425),
the
[#11 identity decision](https://github.com/clockblocker/texteater/issues/11#issuecomment-5140122481),
the [dumgen glossary](../../CONTEXT.md), and the
[identity ADR](../../../../docs/adr/0001-separate-entry-identity-from-lemma-form.md).
Meaning classification may not revisit or disguise unresolved Linguistic Entry
identity. Every case supplies only one eval learner's Meanings for one resolved
opaque Entry.

The canonical result is a discriminated choice:

```ts
type MeaningResolution =
  | { decision: "ReuseExisting"; existingMeaningId: string; draft: null }
  | {
      decision: "DraftNew";
      existingMeaningId: null;
      draft: {
        meaningInEmojis: string;
        descriptionBlocks: readonly string[];
      };
    };
```

Application validation must reject a reused ID outside the supplied inventory,
a reuse result containing a draft, or a new result lacking a draft. The fixed
advancement gate is:

1. zero invalid outputs;
2. 100% exact reuse-versus-new decisions;
3. 100% exact supplied IDs for reuse;
4. 100% exact emoji and ordered description blocks for the fixed new drafts;
5. zero false splits of the declared semantic-penny controls; and
6. zero false merges of the declared note-worthy-use traps.

No retries, repair, majority vote, fuzzy ID matching, or post-hoc semantic
credit is included in the primary score.

## Reproducible prototype and corpus

The isolated runner, immutable corpus, prompts, scorer, raw attempts,
manifests, and summaries live under
[`prototypes/issue-8-meaning-resolution`](../../prototypes/issue-8-meaning-resolution/README.md).
The corpus has 21 cases, each run three times:

| Group | Cases | Purpose |
|---|---:|---|
| baseline reuse | 5 | clear one-candidate reuse |
| semantic-penny controls | 7 | motor/clock/server `laufen`; novel/manual `book`; meeting/department `chair` |
| false-merge traps | 4 | lock versus castle `Schloss`; furniture versus leader `chair` |
| multi-candidate | 4 | select the right `Schloss` or `chair` Meaning |
| empty inventory | 1 | first learner Meaning must be drafted |

The corpus constructor asserts before any API request that every candidate has
the case's `entryId`. All cases use `learner-eval-001`. This prevents a Meaning
from another learner or another Entry from becoming a prompt distractor or a
valid output.

The `Schloss` cases deliberately retain one opaque Entry while allowing the
learner to keep castle and lock Meanings separately. The motor, clock, and
server uses of function-like `laufen` deliberately share one broad Meaning.
The meeting-chair and department-chair uses likewise share one leader Meaning,
while the furniture use is note-worthy enough to separate. These are
learner-local corpus decisions, not claims about authority-scoped Sense
boundaries.

From the repository root, reproduce the original matrix with:

```sh
set -a
source .env.local
set +a
RUN_ID=reproduction-v1 \
ARM_FILTER=direct-descriptions-forward,direct-descriptions-reverse,direct-description-emoji,direct-full-candidates,direct-full-few-shot,agentic-candidate-inspection \
bun battery/dumgen/prototypes/issue-8-meaning-resolution/run.ts
```

Reproduce the single bounded refinement with:

```sh
set -a
source .env.local
set +a
RUN_ID=reproduction-v2 \
ARM_FILTER=progressive-decision-then-draft \
bun battery/dumgen/prototypes/issue-8-meaning-resolution/run.ts
```

The measured outputs are preserved separately in
[`results/v1`](../../prototypes/issue-8-meaning-resolution/results/v1/summary.md)
and
[`results/v2`](../../prototypes/issue-8-meaning-resolution/results/v2/summary.md).

## Access and cost limit

The project exposed only `gpt-5-nano`, which resolved to
`gpt-5-nano-2025-08-07`. A live `gpt-5-mini` probe returned
`403 model_not_found`; model-strength variation could therefore be recorded
only as an access limitation, not measured or inferred.

The original matrix and bounded refinement cost $0.020120 total, excluding the
small access probes and smoke requests. Each manifest captures the
2026-07-31 `gpt-5-nano` schedule: $0.05 per million input tokens, $0.005 per
million cached input tokens, and $0.40 per million output tokens
([official model pricing](https://developers.openai.com/api/docs/models/gpt-5-nano)).

## Original matrix

Every row contains 63 attempts.

| Arm | Full exact | Decision | Reuse ID | Draft exact | False split | False merge | Invalid | p95 | Cost |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| descriptions, forward | 65.1% | 85.7% | 85.4% | 0.0% | 0.0% | 58.3% | 0.0% | 2916 ms | $0.002419 |
| descriptions, reversed | 71.4% | 81.0% | 93.8% | 0.0% | 9.5% | 75.0% | 0.0% | 1939 ms | $0.002393 |
| descriptions + emojis | 57.1% | 79.4% | 75.0% | 0.0% | 14.3% | 66.7% | 0.0% | 3055 ms | $0.002466 |
| full candidates + examples | **74.6%** | **85.7%** | **97.9%** | 0.0% | **0.0%** | 75.0% | 0.0% | **1597 ms** | $0.002470 |
| full candidates + prompt examples | 73.0% | 85.7% | 95.8% | 0.0% | 0.0% | 75.0% | 0.0% | 2214 ms | $0.002833 |
| agentic candidate inspection | 61.9% | 76.2% | 81.3% | 0.0% | 4.8% | 66.7% | 3.2% | 5548 ms | $0.005057 |

`direct-full-candidates` is the measured leader. It got every baseline reuse
and semantic-penny control right across all repetitions, and it chose 47 of 48
reuse IDs correctly. Its errors are nevertheless disqualifying: it falsely
merged 9 of 12 note-worthy trap attempts, missed one multi-candidate
meeting-chair selection, and no generated draft exactly matched the fixed gold.

## Presentation and strategy findings

- **Candidate ordering is not stable.** Reversing description-only candidates
  raised full exactness and reuse-ID exactness but reduced decision exactness,
  introduced 9.5% false splits, and raised false merges from 58.3% to 75.0%.
  A production contract cannot depend on inventory order.
- **Emojis did not help this model.** Adding candidate emojis to descriptions
  reduced full exactness, decision exactness, and reuse-ID exactness and
  introduced more false splits.
- **Candidate examples help reuse but increase anchoring.** Full records with
  descriptions, emojis, and examples produced the best reuse result and zero
  penny-splitting. They also produced a 75% false-merge rate, suggesting that
  richer candidates made the model more reluctant to draft a separate useful
  note.
- **Prompt examples did not help.** Two synthetic non-eval examples slightly
  reduced full and reuse-ID exactness and increased latency and cost.
- **Agentic inspection is rejected.** Required inspection was slower, costlier,
  less accurate, and the only original arm with invalid attempts. Two invalid
  attempts came from failing to request the complete empty inventory.
- **Model strength remains unmeasured.** Only nano was accessible; no conclusion
  about stronger models is supported.

Every arm scored 0% exact drafts. Some drafts were paraphrases with different
emoji or wording; others described the wrong concept, such as furniture for a
meeting leader. Because #5 fixes exact drafts for reproducibility and no
blinded semantic rubric was specified before the run, those outputs receive no
post-hoc credit.

## Bounded decomposition refinement

One refinement tested whether producing a draft in the same call was
contaminating reuse-versus-new classification:

1. a first call returned only `ReuseExisting(id)` or `DraftNew`;
2. a second call generated content only after `DraftNew`.

| Arm | Full exact | Decision | Reuse ID | Draft exact | False split | False merge | Invalid | p95 | Cost |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| progressive decision then draft | 65.1% | 81.0% | 85.4% | 0.0% | 4.8% | 58.3% | 0.0% | 2951 ms | $0.002482 |

The progressive arm did not improve classification, drafting, or latency. It
also created false splits and more multi-candidate failures. It is rejected;
no further prompt tuning was performed.

## Verdict and future contract

**Verdict: no production-eligible winner.** Preserve
`direct-full-candidates` only as the leading experimental baseline, not as a
runtime prompt. The agentic and progressive strategies are rejected on the
measured model.

The dependency boundary remains:

```text
resolved opaque Entry
  -> fetch exactly this learner's Meanings for that Entry
  -> validate candidate scope
  -> reuse one supplied ID OR decide DraftNew
  -> if DraftNew, produce and validate learner-facing draft content
```

The runtime contract should use the discriminated result above and validate
candidate ownership and Entry scope in application code. The measurements do
not justify whether classification and draft generation belong in one model
call or two.

A future evaluation should rerun the unchanged corpus and gate with a stronger
accessible model or a non-LLM semantic retrieval/ranking stage. It should also
predeclare a blinded semantic rubric if paraphrastic drafts are intended to be
acceptable; that rubric must supplement rather than retroactively replace the
fixed exact score. No runtime prompt should be selected until all decision,
reuse, draft, false-split, false-merge, and invalid gates pass.

