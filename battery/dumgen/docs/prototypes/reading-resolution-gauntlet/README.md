# Reading Resolution gauntlet

**Question:** Does the current German Reading Resolution prompt apply the
learner-facing “do not split semantic pennies” policy on the current set of
deliberately tricky test cases?

This is a throwaway, bounded live evaluation. It makes one serial call per
example in the current German Reading Resolution `examplesForTest` array using
`gpt-5-nano`, with no retries and `store: false`. The denominator therefore
tracks the authored array length. A safety cap prevents the runner from making
more than 25 calls. The runner uses a 1,024-token output budget to isolate prompt
behavior from the catalog's production token budget; both values are retained
in each run. It records each output and one contract score:

- **Contract score:** `Reuse` must copy the expected existing description;
  expected `New` cases must return `New` with a description outside the existing
  set. The particular new emoji in the ideal output is documentation and does
  not affect the score.

Cases come directly from
`src/promptsmith/laboratory/prompt-part/reading-resolution/de/examples-for-test.ts`.
The runner refuses to make API calls if that file contains more than 25 cases.

Run it from `battery/dumgen`:

```sh
bun run prototype:reading-resolution-gauntlet
```

Results are retained under `runs/<timestamp>/results.json`.
