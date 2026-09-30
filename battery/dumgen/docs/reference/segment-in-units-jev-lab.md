# German `segment.inUnits` jev lab

The lab tests what jev can do for German `segment.inUnits` (Dumgen ADR
0007): grouping a Sentence's pieces into biggest units and routing each
unit. It is not the production segmenter. Results live in the lab tickets
(#744, #756 on the #701 map) and in git history, not here.

## Layout and dependencies

- `src/segment-in-units/de/` holds the arms, candidate generators, guide
  and routes. `src/segment-in-units/lab/` holds the frozen sets, the cached
  jev and Luna clients, metrics, run evidence, the promptsmith export and
  the ledger. The CLI is `cli/segment-in-units-lab.ts`.
  `cli/segment-ownership-pilot.ts` is a bounded pilot beside it.
- The lab imports only the #731 harness (`src/evaluation/spec-corpus/`),
  promptsmith and dumspec, so it runs while Dumgen is red. Keep it that
  way. Typecheck it with `bun run check:segment-in-units` and test it with
  `bun test tests/segment-in-units`.
- Model calls go through jev (TypeSafe) only. The lab tracks tokens only.

## Commands

```sh
bun run segment-in-units-lab freeze                      # once; --force refreezes
bun run segment-in-units-lab run --arm candidates4 --subset slice300 --reps 3 \
  --opt final=1 --parent <runId> --hypothesis "<one line>"
bun run segment-in-units-lab report --run <runId> [--policy <p>] [--subset <s>] [--relabel 734]
bun run segment-in-units-lab compare --left <runId>[:policy] --right <runId>[:policy] \
  [--subset <s>] [--noise <noiseRunId>] [--record [--verdict "<text>"]]
bun run segment-in-units-lab noise --run <runId> [--reps 3] [--offset 1000]
bun run segment-in-units-lab ledger [--table]
```

- `run` refuses a dirty tree unless `--allow-dirty` is passed. A tree is
  dirty when the lab's sources, the harness, the CLI or `battery/dumspec/src`
  have uncommitted changes. Commit first, so that `gitHead` names the code.
  dumspec records are outside this check, because a run reads the frozen
  set.
- jev is pinned to `pinnedJevModel` in `lab/jev.ts`. `--model` picks another
  version. A floating alias needs `--allow-floating-model`. An answer from a
  version other than the one requested fails the call.
- `--offline` answers from the cache only. A cache miss becomes a case
  error. `--token-budget` moves the ledger's stop line in fresh jev input
  tokens.

## Artifacts

Frozen sets, raw runs, promptsmith exports and the answer cache live in
`.runs/segment-in-units-lab/`, which is gitignored. Commit each run's
evidence and the ledger:

```text
evidence/segment-in-units-lab/
  ledger.jsonl               one line per model-calling command and per compare --record
  runs/<runId>/
    manifest.json            provenance: see RunManifest in lab/provenance.ts
    diff.patch               only when run with --allow-dirty
    outcomes.jsonl.gz        per (case, gold unit): verdict letters per repetition per policy
    summary.json             report of the primary reading; summary--<variant>.json for others
    noise.json               noise reruns only: flip rates per policy and bucket
  summaries/                 reports of runs made before manifests (historical)
```

The pilot writes its manifest, configuration, requests and results to
`.runs/segment-in-units-lab/pilot/runs/<runId>/`.

## Scoring

- The #731 evaluator scores every unit. **unit%** counts Match, and
  **seg%** counts Match plus WrongRoute. Rates are summed over
  repetitions. **flips** counts cases whose contract verdict differs
  between repetitions. `Unresolved` and Foreign gold units are Stubs and go
  unscored.
- `compare` pairs gold units by their majority verdict over repetitions.
  `+a −b` means a units gained and b lost from left to right, with an exact
  McNemar p per bucket (one piece, Lexeme multi-piece, contiguous or
  discontinuous Locution, Saying).
- `compare` scores raw runs when `.runs/` has them and falls back to the
  committed outcomes otherwise. Outcomes are scored against the frozen
  gold, so `--relabel` needs the raw run.
- `noise` reruns a baseline's exact configuration at repetition indices
  past its own, so every answer is fresh and costs a full run. The
  baseline's flip rate r per bucket then sets a floor of 1.96·√(r·n) for n
  paired units. A delta counts as **beyond noise** only when McNemar p <
  0.05 and |a − b| exceeds that floor. `noise` refuses to run when the code
  or dumspec changed since the baseline, unless `--allow-drift` is passed.
  It also flags a rerun whose prompts differ from the baseline's.
- `ledger --table` prints the Markdown iteration table for the active lab
  ticket. Each row shows a run with its parent, hypothesis, unit%, delta
  against the parent, flips, jev input tokens per sentence and verdict. A
  `compare --record` line supplies the delta and verdict. Without one, the
  delta comes from the committed outcomes.
