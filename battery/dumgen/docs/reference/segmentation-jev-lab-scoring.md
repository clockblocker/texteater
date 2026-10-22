# German `segment.inUnits` lab scoring

How the [lab](segmentation-jev-lab.md) and its evaluate runs score and
compare German `segment.inUnits` against frozen gold.

- The #731 evaluator scores every unit, and reports lead in the order of
  [ADR 0008](../adr/0008-judge-segment-in-units-by-membership-before-route.md).
  **mem%** (membership) counts units whose gold Segment set came back
  exactly, whatever the route; the contract verdict is membership.
  **memFlips** (consistency) counts units whose membership differs between
  repetitions. **tol%** adds a route that is the same or one of the five
  tolerated Kind confusions (PART/ADV, CCONJ/ADV, ADJ/ADV, NOUN/PROPN,
  PRON/DET, within Lexeme, either way), defined once in
  `lab/evaluation/spec-corpus/segment-in-units-route-tolerance.ts`. A
  borderline unit may carry route variants instead (Dumgen ADR 0007); its
  route counts for tol% when the gold route is
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
  answers. `--opt pick=<margin>` asks #760's generic pick prompt for those
  units (a fresh `pick` request) and adds a `+pick` policy; `report` scores
  the pick on the units that carried variants.
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
  `lab/segmentation/harness/focus.ts` read outcome rows, so a variant scored in memory compares
  the same way. The focus set is fixed: never re-derive it from a later
  run.
- The 2026-10-02 refreeze (#701) broke that rule once, with the user's
  approval, because the gold under `dev@90c1afa7a4df706d` had changed.
  `dev@adb64b2bdaf31f4f` and `heldout@c23a5cc90ca8afc9` were frozen at
  bb136b6c. The focus set was then taken again from an offline replay of
  the reference at its adopted floors. The 112 dev cases the cache did not
  cover are outside it, and no unit counts as disputed, because #739 has
  closed. Focus, guardrail and set-level figures don't compare across the
  refreeze, and runs on the old sets no longer get a focus block.
- A second refreeze that day, at 16da573e, picks up the #853 gold fixes
  (kept hyphens, `…?` as two marks, signs that stand for a word made
  ResolvableText, the emoji OpaqueText), #851's re-cut Draft records and
  #595's der meine, sich schämen für and voller. Dev is now
  `dev@60270b6bfb5062ae`, 1276 cases as before, 20 of them with new
  Segments or gold units. Held-out came out with the same cases and hash,
  so it stays `heldout@c23a5cc90ca8afc9` as frozen at bb136b6c. The focus
  set was not taken again. It reads only `dev@adb64b2bdaf31f4f`, so runs
  on the current dev get no focus block and `--subset focus` refuses it.
  Earlier runs stay scored on `dev@adb64b2bdaf31f4f`.
- A third refreeze, on 2026-10-03 at 0efc8d65, picks up #884's reopened
  Segmentation of sie-uebersetzt-den-vertrag-ins-deutsche: the governed
  `in` of `ins` joins `[übersetzt, in]`. Held-out is now
  `heldout@1a69c4258c71f152`, the same 189 cases and 725 gold units, with
  that one unit changed. Dev is now `dev@b6fca287295d4ee3`, 1279 cases:
  #876's three Foreign en Draft records joined it, and no other case
  changed. Held-out runs before it stay scored on
  `heldout@c23a5cc90ca8afc9`. The round was not re-pinned: #876 changed
  the inventories, and an offline replay of
  20261002T122056--production--heldout--all misses the cache on 15 case
  repetitions.
- A fourth refreeze, on 2026-10-03 at 06888a0a, picks up #877's ruling 7:
  *Da kann ich nichts für* is one Locution VERB, `nichts dafür können`,
  over `[Da, kann, nichts, für]`, where the split ADV `dafür` and the VERB
  `können` were two units. Dev is now `dev@9408e60258d4f891`, the same
  1279 cases with 2024 gold units, and only that case changed. Held-out
  came out unchanged at `heldout@1a69c4258c71f152`. Dev runs before it
  stay scored on `dev@b6fca287295d4ee3`. The round was not re-pinned.
- A fifth refreeze, on 2026-10-03 at 69eca225, picks up #884's batch 3:
  the nine dev Drafts promoted to held-out (user ruling Q4) are excluded
  from both sets in the sidecar until the user reviews them through
  Knowledge, so they leave dev now and join held-out at the refreeze
  after their approval. Dev is now `dev@36d553aa792208e7`, 1270 cases
  with 2015 gold units: those nine cases left and no other case changed.
  Held-out came out unchanged at `heldout@1a69c4258c71f152`. Dev runs
  before it stay scored on `dev@9408e60258d4f891`. The round was not
  re-pinned.
- A sixth refreeze, the same day at 4f601f12, follows the user's approval
  of batch 3: the nine records rose to Review Depth Knowledge and their
  sidecar exclusions went. Held-out is now `heldout@28d4be8d9bcafb00`,
  198 cases (95 Full) with 735 gold units: the nine joined
  `heldout@1a69c4258c71f152` and no other case changed. Dev came out
  unchanged at `dev@36d553aa792208e7`. Held-out runs before it stay
  scored on `heldout@1a69c4258c71f152`. The round was not re-pinned,
  since a re-pin would change the replayed metrics.
- `compare` scores raw runs when `.runs/` has them and falls back to the
  runs' outcomes in `.runs/` otherwise. Outcomes are scored against the
  frozen gold, so `--relabel` needs the raw run. A noise floor under
  another measure than membership needs the outcomes of the baseline and
  its rerun; without them, `noise.json` gives the membership floor.
- `noise` reruns a baseline's exact configuration at repetition indices
  past its own, so every answer is fresh and costs a full run. The
  baseline's flip rate r per bucket then sets a floor of 1.96·√(r·n) for n
  paired units. A delta counts as **beyond noise** only when McNemar p <
  0.05 and |a − b| exceeds that floor. `noise` refuses to run when the code
  or dumcorpus changed since the baseline, unless `--allow-drift` is passed.
  It also flags a rerun whose prompts differ from the baseline's.
- `ledger --table` prints the Markdown iteration table for the active lab
  ticket. Each row shows a run with its parent, hypothesis, membership%,
  membership delta against the parent, membership flips, tolerant%,
  strict%, jev input tokens per sentence and verdict. A
  `compare --record` line supplies the delta and verdict. Without one, the
  delta comes from the runs' outcomes in `.runs/`.
