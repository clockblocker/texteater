# Promptsmith

Schema-independent corpus selection and evaluation of production operations.
Linguistic schemas and evaluators belong to the consumer.

A corpus stores cases without assigning a role. Select demonstrations explicitly;
use `union`, `intersection` and `difference` to compose demonstration and test
selections. `runOperationExperiment` rejects demonstrations and tests that
share a case or a contamination key before it runs any case.

`promptsmith/evaluation` runs the consumer's operation on each selected case
and records its effective configurations, corpus fingerprint, outputs, call
traces, token usage, evaluator results, timing and failures. Execution status
is separate from the evaluator's score. `promptsmith/storage` saves,
validates, reopens and compares these operation runs (manifest version 2).
Promptsmith ships no model transport; the consumer's operation makes its own
calls.

## Repeated runs

`runOperationExperiment` accepts `repetitions` (default 1), the number of
times each selected case runs. A case's repetitions run back to back. A run
with one repetition writes exactly the record shape it always has.

With two or more repetitions:

- `manifest.repetitions` stores the count.
- Each case keeps every attempt in `repetitions`, including its output,
  evaluator result, timing, failure, traces and usage.
- The case's top-level attempt fields mirror one representative repetition:
  the first that did not execute cleanly, or otherwise the first. `status`,
  `summary.succeeded`, `summary.failed` and `summary.interrupted` therefore
  count a case as succeeded only when every repetition succeeded.
  `summary.quality` still counts one verdict per case, taken from the
  representative.
- Each case's `stability` holds the quality counts over its repetitions,
  plus `flipped` and `distinctOutputs`. A case flips when at least one
  repetition passed the evaluator's contract (`contractPass: true`,
  not under review) and at least one other did not. An execution failure
  counts as not passing. Interrupted repetitions are ignored, so cancelling a
  run never creates flips. `distinctOutputs` counts the different outputs
  produced, compared by common-utils' `canonicalJson`.
- `summary.stability` reports `flipped` and `varyingOutputs` (cases with more
  than one distinct output) across the run, and `quality` over every
  repetition. "11 of 238 cases flipped" reads as `summary.stability.flipped`
  of `summary.total`.

All of these fields are optional in the stored schema, so records written
before repetitions existed still load. `loadRun` rejects a record whose
repetition fields disagree with its manifest or with the repetitions they
summarize.

## Comparing runs

`compareRuns(left, right)` pairs cases by `caseId`. Each pair includes:

- `outputChanges`: every JSON path where the outputs differ, such as
  `units[2].route.kind`, with the value on each side and whether it was
  `Added`, `Removed` or `Changed`. Arrays compare by index, and keys added or
  removed count as differences. The empty path is the root value.
- `verdict`: the evaluator verdict on each side (`Passed`, `Failed`,
  `NeedsReview` or `Unscored`), and `verdictChanged`.

The comparison also lists `onlyLeft`, `onlyRight`, `changedVerdicts` and
`changedOutputs` by case ID. One-sided cases carry a `null` verdict for the
missing side and no output changes.

For a case with repetitions, the compared output is its most frequent output
by `canonicalJson`, with ties going to the earliest repetition. The compared
verdict is the one its non-interrupted repetitions share, or `Mixed` when
they disagree, so every flipped case is `Mixed`. This keeps one diff per case
whichever side repeated. It also means a case that goes from `Passed` to
`Mixed` shows up as a verdict change, while random variation between
repetitions stays out of the field diff. Each record's `stability` and
`repetitions` remain in the pair for anything finer.
