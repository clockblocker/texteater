# Reading Resolution gauntlet

**Question:** Does the current German Reading Resolution prompt apply the
learner-facing “do not split semantic pennies” policy on the current set of
deliberately tricky test cases?

This is a throwaway, bounded live evaluation. It makes one serial call per case
in the pinned Reading Resolution evaluation suite using `gpt-5.6-luna` with no
reasoning, no retries, and `store: false`. The denominator tracks the explicit suite
length. A safety cap prevents the runner from making more than 25 calls. The
runner uses a 1,024-token output budget to isolate prompt behavior from the
catalog's production token budget; both values are retained in each run.

Each run retains its exact ordered evaluation case IDs, start and completion
times, prompt hash, model and token policy, outputs, contract score, and score
ratio. A live run is always draft evidence until it is finalized. Finalized
evidence meets the machine threshold only when all of these are true:

- at least 15 cases were attempted;
- the contract score ratio is at least `0.8`;
- no attempt ended in an execution or provider error; and
- every scored miss has an explicit classification.

Before creating a provider client, the runner requires 15–25 cases and parses
and projects every selected input and ideal output. It exits unsuccessfully
after still writing any completed live result because offline finalization is
required. A provider or execution error can therefore never be hidden by a
high score on the remaining cases.

The contract score is:

- **Contract score:** `Reuse` must copy the expected existing description;
  expected `New` cases must return `New` with a description outside the existing
  set. The particular new emoji in the ideal output is documentation and does
  not affect the score.

The reusable selection and pure scorer live under
`src/promptsmith/laboratory/experiments/reading-resolution-gauntlet`. The
provider runner owns the call cap and refuses to make API calls if the suite
contains more than 25 cases. It assembles the system prompt directly from the
validated Prompt Experiment source before making provider calls.

Run it from `battery/dumgen`:

```sh
bun run prototype:reading-resolution-gauntlet
```

Results are retained under `runs/<timestamp>/results.json`. Writes use an
atomic same-directory replacement so finalization cannot expose a partially
written result.

## Classifying misses

The live runner never guesses why a scored output missed. Every attempt starts
with `missClassification: null`; this remains correct for passes. When a run
has scored misses, create a checked-in JSON sidecar beside its result, keyed by
failed case ID:

```json
{
  "reading-de-example": {
    "classification": "prompt defect",
    "explanation": "The body does not explain the applicable boundary."
  }
}
```

The only allowed classifications are `prompt defect`, `corpus/evaluator
defect`, and `accepted model limitation`. Explanations must be non-empty. Then
finalize the retained result without making another model call:

```sh
bun run docs/prototypes/reading-resolution-gauntlet/run.ts finalize \
  docs/prototypes/reading-resolution-gauntlet/runs/<timestamp>/results.json \
  docs/prototypes/reading-resolution-gauntlet/runs/<timestamp>/miss-classifications.json
```

Finalization fully validates the v2 result, recomputes evaluator diagnostics and
all score summaries, and records `finalizedAt` without changing the live
`completedAt`. It also requires an exact match with the current ordered suite,
Golden Case inputs and ideal outputs, assembled Prompt Source hash, catalog
model, token budgets, reasoning and verbosity policy, retry count, and storage
policy. An obsolete run can never be finalized as current evidence.

Finalization rejects missing classifications, classifications for passing or
unknown cases, and any run containing execution or provider errors. Such an
errored run remains useful diagnostic output but cannot be qualifying evidence;
make a fresh bounded run instead. Re-run finalization when auditing retained
evidence after source changes; source drift is reported without modifying the
old result.
