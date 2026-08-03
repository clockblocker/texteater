# German Lexeme/NOUN Grammatical Resolution reference evaluation

This is the reusable reference protocol for evaluating one Grammatical
Resolution route. Its route-local Golden Corpus contains 26 cases across
Surface, Lemma, Core Feature, orthography, normalization, and Unresolved
boundaries. Seven cases are necessary policy demonstrations; 15 settled cases
form the explicitly pinned, disjoint evaluation suite. Three provisional policy
cases remain corpus-only for human review, and one earlier happy path remains
unassigned after demonstration minimization.

The bounded live runner makes one serial call per evaluation case with
`gpt-5.6-luna`, no reasoning effort, no retries, `store: false`, and a 1,024-token output cap. Before
creating a provider client, it requires 15–25 cases and parses and projects
every selected input and ideal output. It assembles the prompt from the
validated Prompt Source and records the exact ordered case IDs, prompt SHA-256,
model and generation policy, timestamps, outputs, field diagnostics, score,
response metadata, and errors.

An attempt passes only when its schema-parsed output has the same canonical
semantic model fields as the pinned ideal output. The evaluator treats an
all-null model `surfaceFeatures` bag like `null`, matching the runtime codec,
and keeps every grammatical field exact. The retained diagnostics explain
where a miss occurred without weakening that contract. Every live result is draft
evidence until offline finalization. Finalized evidence qualifies only when all
of these are true:

- at least 15 cases were attempted;
- the contract score is at least 80%;
- no attempt ended in an execution or provider error; and
- every scored miss has an explicit human classification.

Run from `battery/dumgen`:

```sh
bun run prototype:grammatical-resolution-noun
```

Results are retained under `runs/<timestamp>/results.json`. The live runner
always exits unsuccessfully after atomically retaining its draft result, making
finalization an explicit review gate. Provider errors always require a fresh
run.

## Classifying misses

The runner never infers why a model output missed. Create a JSON sidecar next to
the result, keyed by every failed case ID:

```json
{
  "grammar-de-noun-example": {
    "classification": "prompt-defect",
    "explanation": "The prompt does not state the applicable boundary."
  }
}
```

The classification must be `prompt-defect`,
`corpus-or-evaluator-defect`, or `accepted-model-limitation`; every explanation
must be non-empty. Finalize without another provider call:

```sh
bun run docs/prototypes/grammatical-resolution-noun/run.ts finalize \
  docs/prototypes/grammatical-resolution-noun/runs/<timestamp>/results.json \
  docs/prototypes/grammatical-resolution-noun/runs/<timestamp>/miss-classifications.json
```

Finalization strictly validates the v4 artifact, recomputes every evaluator
diagnostic and score summary, records `finalizedAt` without changing
`completedAt`, and atomically replaces the result. It requires an exact match
with the current ordered suite, Golden Case inputs and ideal outputs, assembled
prompt hash, catalog model, token budgets, reasoning and verbosity policy,
retry count, and storage policy. It rejects missing classifications,
classifications for passing or unknown cases, runs containing provider or
execution errors, and obsolete evidence. The resulting retained run is the
evidence artifact future route teams should review and cite.
