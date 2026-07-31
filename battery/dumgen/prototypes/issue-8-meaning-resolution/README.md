# PROTOTYPE — issue #8 learner Meaning resolution

Throwaway measured prototype for
[`clockblocker/texteater#8`](https://github.com/clockblocker/texteater/issues/8).
It asks how a resolved opaque Linguistic Entry should reuse one of that
learner's existing Meanings or draft a genuinely note-worthy new Meaning
without splitting semantic pennies.

This is not production code. The corpus is eval-only and asserts that every
candidate belongs to the single eval learner and the case's resolved Entry.

## Run

From the repository root:

```sh
set -a
source .env.local
set +a
bun battery/dumgen/prototypes/issue-8-meaning-resolution/run.ts
```

Defaults are three repetitions, six concurrent attempts, `gpt-5-nano`, and
run ID `current`. Override with `REPETITIONS`, `CONCURRENCY`, `SHUFFLE_SEED`,
`MODEL`, `RUN_ID`, `CASE_LIMIT`, or `ARM_FILTER`.

The original six arms vary candidate descriptions, emojis, examples, ordering,
prompt examples, and direct versus required agentic inspection:

1. `direct-descriptions-forward`
2. `direct-descriptions-reverse`
3. `direct-description-emoji`
4. `direct-full-candidates`
5. `direct-full-few-shot`
6. `agentic-candidate-inspection`

One bounded evidence-driven refinement,
`progressive-decision-then-draft`, separates reuse-versus-new classification
from draft generation.

Raw attempts, manifests, access probes, token/cost records, and summaries are
written under `results/<run-id>/`.
