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
bun run segment-in-units-lab sweep --run <runId> [--policy <p>] [--replay <runId>[:policy]]
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
- The `reference` arm takes its resolver floors as options (`--opt
  expression=0.6`; `floorsOf` in `arms/reference.ts`). Its default is the
  setting #762 adopted; `--opt floors=run` replays the #755 reference run.
  `--opt unasked=unresolved` routes groups no cached route request asked
  about `Unresolved` instead of asking, so a setting runs offline. The
  `reference-floors` arm sweeps the floors from the same cached answers,
  one policy per setting (`--opt grid=single|combined`), and `sweep` reads
  every policy of such a run against its baseline.

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

- The #731 evaluator scores every unit, and reports lead in the order of
  [ADR 0008](../adr/0008-judge-segment-in-units-by-membership-before-route.md).
  **mem%** (membership) counts units whose gold Segment set came back
  exactly, whatever the route; the contract verdict is membership.
  **memFlips** (consistency) counts units whose membership differs between
  repetitions. **tol%** adds a route that is the same or one of the five
  tolerated Kind confusions (PART/ADV, CCONJ/ADV, ADJ/ADV, NOUN/PROPN,
  PRON/DET, within Lexeme, either way), defined once in
  `src/evaluation/spec-corpus/segment-in-units-route-tolerance.ts`. A
  borderline unit may carry route variants instead (Dumgen ADR 0007,
  amended 2026-09-30); its route counts for tol% when the gold route is
  among them, and the five pairs apply to single routes only.
  **strict%** is the exact match, kept for comparison; it reads a
  borderline unit's first route. **var%** counts the units with membership
  that carry variants, and **k** their mean number of routes, so returning
  variants can't stand in for deciding. Rates are summed over repetitions.
  **caseFlips** counts cases whose contract verdict differs between
  repetitions. `Unresolved` and Foreign gold units are Stubs and go
  unscored. Outcome letters mark an acceptable route miss `A` and any
  other `R`; `k` keeps each repetition's variant count.
- Grouping sits beside membership (#701), because hovering a Segment
  highlights its whole unit. Its headline is **hover**, B-cubed over what
  each hover shows. A hovered Segment p highlights H(p), itself and the
  Segments of every returned unit holding it, against G(p), the Segments
  of its gold unit. precision(p) = |H∩G|/|H| and recall(p) = |H∩G|/|G|,
  each averaged over hovered Segments and summed over repetitions, with
  the F1 of the two means. Only Segments of scored gold units are hovered.
  Every asserted unit is complete, Partial records included, so a
  highlighted Segment outside G(p) counts against precision whether or not
  a gold unit asserts it: every hovered Segment's precision is decided.
  **unasserted** counts the highlighted Segments no gold unit asserts,
  which only this rule judges. A Stub's Segments are not hovered, but one
  highlighted beside a scored Segment is false. A failed case scores as an
  empty answer, where each Segment highlights only itself. **Full** reads
  Full records alone, as a check on that rule, and **multi** reads
  Segments of multi-piece gold units, where a hover shows more than the
  Segment itself. Each gives [records, hovered Segments]. `report` prints
  hover P/R/F1 beside mem%. The evaluator carries each case's sums as
  `hover`, and the `segment-in-units/de:dev` and `:heldout` experiments of
  `cli/evaluate.ts` print the same rates.
- The pair rates read the same grouping by Segment pairs, which weigh a
  unit by its pairs, so long units dominate. **pairR** counts the Segment
  pairs inside scored gold units that one returned unit keeps together, on
  every record. **pairP** counts the returned pairs that one gold unit
  holds, on Full records only, since a Partial record cannot show two
  unannotated Segments wrongly joined. **assertedP** does the same for
  returned pairs that touch an asserted unit on any record: every asserted
  unit is complete. **over** counts returned units that join Segments of
  two or more gold units, and **under** counts gold units split across
  returned units. Each figure names the records it is counted over.
  `report` also gives membership of discontinuous gold units and writes
  every over- and under-merge once, one line each with its repetitions, to
  `grouping.over` and `grouping.under` in `summary.json`. `compare` prints
  each side's grouping and its membership per phenomenon tag; both need
  the raw run.
- The `reference` arm's `--opt variants=<margins>` adds a policy per
  margin whose units carry variants where the top two shares of the
  distribution that decided the route lie within it, read from the same
  answers. `--opt pick=<margin>` asks the click-time pick for those units
  (a fresh `pick` request) and adds a `+pick` policy; `report` scores the
  pick on the units that carried variants.
- `compare` pairs gold units by their majority over repetitions, on
  membership first, then prints each side's consistency and the tolerant
  and strict deltas. `+a −b` means a units gained and b lost from left to
  right, with an exact McNemar p per bucket (one piece, Lexeme multi-piece,
  contiguous or discontinuous Locution, Saying).
- On the set `evidence/segment-in-units-lab/membership-focus.json` was
  taken from (dev), `report`, `compare` and `ledger --table` add a
  **focus** block (#761). It reads the focus units on their own (held and
  wrong by majority, memFlips, mem%, tol%), split by #755 cause, with the
  units of records in review (#739) apart. `compare` counts per focus unit
  **fixed** (wrong → held by majority), **broken** (held → wrong),
  **stabilised** (flipping → not) and **destabilised**. Every other unit
  is the **guardrail**, counted the same way: the rest of the focus cases,
  and the other cases when a run covers more of dev. `compare --record`
  keeps these counts in the ledger. `scoreFocus` and `compareFocus` in
  `lab/focus.ts` read outcome rows, so a variant scored in memory compares
  the same way. The focus set is fixed: never re-derive it from a later
  run.
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
  ticket. Each row shows a run with its parent, hypothesis, membership%,
  membership delta against the parent, membership flips, tolerant%,
  strict%, jev input tokens per sentence and verdict. A
  `compare --record` line supplies the delta and verdict. Without one, the
  delta comes from the committed outcomes.
