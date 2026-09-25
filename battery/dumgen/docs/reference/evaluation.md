# Dumgen evaluation

`bun run --cwd battery/dumgen evaluate --experiment ID --revision REV` runs one
experiment and saves a Promptsmith run in `<output>/<runId>/`: `manifest.json`,
`cases.jsonl` and `summary.json`. `<output>` is `--output`,
`DUMGEN_RUN_DIRECTORY` or the untracked `.runs/dumgen/`.

## Spec-backed experiments

An experiment is spec-backed when its cases project from dumspec Spec Records
(ADR 0037). Today that is every `grammatical-resolution/*` experiment and its
slices. Codegen writes each projected case's origin into the route's
`src/generated/grammar-cases/<family>/<kind>.json` as
`origins[caseId] = { record, target, status }`: the record id, the target's
index in `targets`, and its Review Status. A case
the sidecar owns, such as an `Unresolved` answer, has no origin. To make
another stage spec-backed, emit `origins` with `codegen/case-origin.ts` and
add the route's origins to `caseOrigins` in `src/development.ts`.

For a spec-backed run, `evaluate` also prints `review`:

```json
{
  "scores": {
    "Reviewed": { "total": 45, "passed": 41, "failed": 3, "needsReview": 0, "unscored": 1 },
    "Draft": { "total": 0, "passed": 0, "failed": 0, "needsReview": 0, "unscored": 0 },
    "DumgenOwned": { "total": 2, "passed": 2, "failed": 0, "needsReview": 0, "unscored": 0 }
  },
  "disagreements": 3,
  "disagreementsFile": ".runs/dumgen/<runId>/disagreements.jsonl"
}
```

Each group counts like the run's `summary.quality`. `DumgenOwned` holds the
cases without an origin. The run's case set and `summary` are unchanged; the
split only adds to them.

## Disagreement list

Every spec-backed run writes `<output>/<runId>/disagreements.jsonl`: one JSON
object per line, in run order, for each Reviewed case whose evaluation failed
(`contractPass: false`). The file is empty when nothing disagrees. Failures
without an evaluated answer, such as provider errors, are not listed. Each line
is review input: either the pipeline or the record is wrong.

```json
{"record":"de/aus-angst-vor-hunden-bleibt-sie-zu-hause","target":0,"caseId":"grammar-de-noun-governed-angst-vor","expected":{"$.surface.inflectionalFeatures.case":"Dat"},"produced":{"$.surface.inflectionalFeatures.case":"Acc"}}
```

- `record`, `target`: the Spec Record id and target index.
- `caseId`: the Dumgen case id in `cases.jsonl`.
- `expected`, `produced`: only the paths where the gold answer and the
  pipeline's answer differ. `$` is the whole answer and `$.a.b` a key below
  it. Objects are compared key by key; arrays and other values are compared
  whole. A path present on only one side appears only in that side's object.
