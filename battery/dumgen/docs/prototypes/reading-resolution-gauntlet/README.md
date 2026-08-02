# Reading Resolution gauntlet

**Question:** Does the current German Reading Resolution prompt apply the
learner-facing “do not split semantic pennies” policy on ten deliberately
tricky cases?

This is a throwaway, bounded live evaluation. It makes ten serial calls through
the current prompt catalog using `gpt-5-nano`, no retries, and `store: false`.
The runner uses a 1,024-token output budget to isolate prompt behavior from the
catalog's production token budget; both values are retained in each run. It
records each output and one contract score:

- **Contract score:** `Reuse` must copy the expected existing description;
  expected `New` cases must return `New` with a description outside the existing
  set. The particular new emoji in the ideal output is documentation and does
  not affect the score.

Cases come directly from
`src/promptsmith/laboratory/prompt-part/reading-resolution/de/examples-for-test.ts`.
They are added one at a time only after their input and ideal output have been
discussed and agreed. The runner refuses to make API calls until that file
contains exactly ten cases.

Run it from `battery/dumgen`:

```sh
bun run prototype:reading-resolution-gauntlet
```

Results are retained under `runs/<timestamp>/results.json`.
