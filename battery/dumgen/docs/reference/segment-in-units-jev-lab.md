# German `segment.inUnits` jev lab

The lab measures German `segment.inUnits` (Dumgen ADR 0007): grouping a
Sentence's pieces into biggest units and routing each unit. The segmenter
itself is production code under `src/segment/`; the lab's arms configure
it and score it against frozen gold. Results live in the lab tickets
(#744, #756 on the #701 map) and in git history, not here.

## Layout and dependencies

- `src/segment/` is the production segmenter. It reaches jev only through
  the injected `ask` port of `src/segment/ask.ts`, and the lab passes its
  cached jev as that port. `src/segment/de/segments.ts` is the Segment
  stage: it stitches a Sentence and cuts it into Segments.
  `src/segment/de/units.ts` is the unit stage. Nomination
  (`nomination.ts`) asks what jev judges about code's candidates,
  membership (`assembly.ts`) assembles units under floors, and routing
  (`routing.ts`) routes them. Its default, `productionUnitSettings`, is
  candidates4's maxim+closed policy (#843) with the code rules of X3, X5,
  D4 and X4 (`code-rules.ts`, #851): each enforces one dumcorpus Rule over the
  assembled membership, dropping a link its Rule forbids or adding one its
  Rule decides from the words alone. Then X5's Locution Choice
  (`locution-choice.ts`) asks one more request, `locution`, about the units
  a sub-floor link still joins, and merges those whose two units both pass
  de/fixed-member-test. Last, D4's Verb Choice (`verb-choice.ts`) asks
  one `verb` request about the lassen, bekommen, haben and sein forms whose
  auxiliary slot named an infinitive or participle, and joins or splits
  each by its Rule (causative lassen and sich lassen, the recipient
  passive, perfect or state). After it, X4's Government Choice
  (`government-choice.ts`) asks one `government` request about the
  prepositions whose grouping depends on valency: one the preposition slot
  joined, a particle join whose word opens a phrase, a host another link
  took or a nearer twin, the same preposition twice on one host (a duel),
  and an idiom unit that took in a member noun's preposition (literal or
  not). Each question names the phrase and tells a governed preposition
  from a place, direction or adjunct by E-VALBU's stand-ins
  (de/governed-preposition-joins-its-governor, de/idiom).
- `src/segment-in-units/de/arms/` holds the three arms. `candidates4`
  (`--opt final=1 --opt closed=1`) outputs v3, step0, step0+saying and
  step0+saying+maxim@0.7, each step-0 policy also `+closed`; production is
  its `step0+saying+maxim@0.7+closed`. `production` runs the unit stage as
  `productionUnitSettings` sets it, so it follows a changed default, and
  takes #851's offline levers: `--opt grid=x1` (floors × Saying assembly ×
  step 0), `--opt pool=mean,median` (answers pooled across the cache's
  repetitions 0 to 2, `lab/pool.ts`), `--opt variants=<margins>` and
  `--opt x3=<rules>|all` (each code rule added to production's own, and
  all together; `was-fuer` asks its Noul in `final`, a fresh request for
  a Sentence with was … für) and `--opt x5=<floor>[-noabsorb][-sc],…`
  (the Locution Choice at each floor over production's rules, `sc` adding
  `saying-closed`; the variants of one rule set share one `locution`
  request) and `--opt verb=<floor>[-<family>…],…` (the Verb Choice at each
  floor over the families named, all five when none is; every variant
  reads one `verb` request over all five families) and `--opt
  gov=<floor>[-<family>…],…` (the Government Choice at each floor over the
  families named, all six when none is; every variant reads one
  `government` request, asked over production's membership).
  `reference` is the #755 reference.
  The retired arms and candidates4's other levers are at ec467e8d, and
  reference-floors at 5335f033.
- `src/segment-in-units/lab/` holds the set freezing, the cached jev
  (`jev-cache.ts`), metrics, run evidence, the promptsmith export, the
  ledger and the rounds (`round.ts`). The CLI is
  `cli/segment-in-units-lab.ts`. The cached jev is a `JevAsk` over
  production's TypeSafe ask (`src/segment/typesafe-ask.ts`): it keys each
  answer by its question, so how a request is chunked never decides a
  hit, and it retries a fresh request that met a 429, a 5xx or no status,
  up to six times with backoff. Production never retries (#858, #871).
- `src/evaluation/experiments.ts` is the table of experiments
  `cli/evaluate.ts` runs, in gold, raw and text mode (see Evaluate). It
  reads the lab's sets and cache; `segment-in-units-raw.ts`,
  `source-evaluation.ts` and `split-text.ts` beside it score raw and text
  mode.
- Besides the production segmenter, the lab imports only the #731 harness
  (`src/evaluation/spec-corpus/`), promptsmith and dumcorpus. Keep it that
  way. Typecheck it with `bun run check:segment-in-units` and test it with
  `bun test tests/segment-in-units`.
- Model calls go through jev (TypeSafe) only. The lab tracks tokens only.

## Commands

```sh
bun run segment-in-units-lab freeze                      # once; --force refreezes
bun run segment-in-units-lab run --arm candidates4 --subset slice300 --reps 3 \
  --opt final=1 --opt closed=1 --parent <runId> --hypothesis "<one line>"
bun run segment-in-units-lab replay --run <runId>
bun run segment-in-units-lab report --run <runId> [--policy <p>] [--subset <s>] [--relabel 734]
bun run segment-in-units-lab compare --left <runId>[:policy] --right <runId>[:policy] \
  [--subset <s>] [--noise <noiseRunId>] [--record [--verdict "<text>"]]
bun run segment-in-units-lab noise --run <runId> [--reps 3] [--offset 1000]
bun run segment-in-units-lab sweep --run <runId> [--policy <p>] [--replay <runId>[:policy]]
bun run segment-in-units-lab ledger [--table]
bun run segment-in-units-lab round [--repin --reason "<why>"]
bun run segment-in-units-lab round --open <id> --cap <tokens> --stop-line <tokens> [--note "<text>"]
```

- `run` refuses a dirty tree unless `--allow-dirty` is passed. A tree is
  dirty when the production segmenter, the lab's sources, the harness, the
  CLI or `battery/dumcorpus/src` have uncommitted changes. Commit first, so
  that `gitHead` names the code. dumcorpus records are outside this check,
  because a run reads the frozen set.
- `replay` reruns a raw run offline with today's code and compares every
  policy's output, case by case and repetition by repetition, with what
  the run stored. It asks nothing and writes nothing, and it exits 1 when
  an output differs or a case fails. A refactor of `src/segment/` must
  replay the latest runs exactly. The inventories it reads shape the
  requests; Bun loads them from dumcorpus's source.
- `freeze --force` adds each new set beside the one it replaces, at
  `evidence/segment-in-units-lab/sets/<name>@<hash>.json.gz`, and points
  `current.json` there. A set whose hash is kept already stays as first
  frozen. `report`, `compare`, `sweep`, `replay` and
  `segment-in-units-attribution` read a run's set by its hash, so a run
  stays scored against the gold it ran on. `withheldRecords` in
  `lab/corpus.ts` keeps a record out of both sets while its gold waits for
  a person's approval.
- jev is pinned to `pinnedJevModel` in `src/segment/jev.ts`. `--model` picks another
  version. A floating alias needs `--allow-floating-model`. An answer from a
  version other than the one requested fails the call.
- `--offline` answers from the cache only. A cache miss becomes a case
  error. `--estimate` prices a `run`, `noise` or `limit-qpc` offline and
  stops (see Rounds). `--token-budget` moves the round's stop line, up to
  its cap.
- The `reference` arm takes its resolver floors as options (`--opt
  expression=0.6`; `floorsOf` in `arms/reference.ts`). Its default is the
  setting #762 adopted; `--opt floors=run` replays the #755 reference run.
  It pins the AUX inventory to the one its run read. `--opt
  unasked=unresolved` routes groups no batched route request asked about
  `Unresolved` instead of asking, so a setting runs offline. `sweep` reads
  every policy of a run against its baseline.

## Evaluate

`cli/evaluate.ts` runs the production segmenter over the lab's frozen
sets, one experiment per set and mode, and saves a promptsmith run:

```sh
bun run evaluate --experiment segment-in-units/de:dev --revision <rev> --offline \
  [--units production|reference] [--parity <labRunId>[:policy]]
bun run evaluate --experiment segment-in-units/de:heldout:raw --revision <rev>
bun run evaluate --experiment segment-in-units/de:dev:raw --estimate
bun run evaluate --experiment split-text/de:ud-drafts --revision <rev>
```

- **Gold mode** (`segment-in-units/de:dev`, `:heldout`): a case's gold
  Segments go in, and production's unit stage (`segmentGermanUnits`) groups
  and routes them. `--units reference` runs the reference arm at its
  adopted floors instead, for comparison. `--parity <labRunId>[:policy]`
  compares every case and repetition with a lab run's output, by default
  its `step0+saying+maxim@0.7+closed` (the reference's primary with
  `--units reference`), and exits 1 on any difference or failure. Offline,
  gold mode matches the `production` arm's `production` policy. Before
  X3's code rules it matched fa59d50e's candidates4 runs exactly, except
  the one dev case whose `voller` became an ADP after the fill and so
  misses the cache.
- **Raw mode** (`:raw`), the production headline: the record's Sentence goes
  in as written, `segmentGermanSentence` cuts it, and the unit stage groups
  the Segments. Predicted Segments align to gold ones by exact span, text
  and kind. A predicted ResolvableText Segment no gold Segment matches joins
  the scoring as a Segment no gold unit asserts, and a gold Segment no
  prediction matches hovers only itself. The metrics add the Segment
  stage's to gold mode's: boundary P/R/F1 over the cuts between Segments,
  exact-piece P/R/F1 over ResolvableText Segments, surface accuracy, the
  Sentences cut exactly, and those cut exactly as gold, surfaces included,
  whose unit-stage requests are gold mode's and replay its cache.
- **Text mode** (`split-text/de:ud-drafts`): `splitText` cuts each Text of
  `battery/dumcorpus/ud-drafts` into paragraphs and Sentences, scored by
  sentence-boundary P/R/F1 in the Text's visible characters, so trimmed
  whitespace and joined hard wraps don't count. #738's Text Records will
  replace ud-drafts. Code splits; no model runs.
- Every mode reports membership, multi-piece membership and hover B-cubed
  as the lab does, over the repetitions that ran. Each case runs three
  times, answered from the lab's cache by repetition.
- A segment.inUnits run writes a ledger line (`command: "evaluate"`) and
  counts against the round like a lab run: `--estimate`, the stop line, the
  projection and the pin all apply. A live run fills the cache
  concurrently before promptsmith replays it case by case.
- The production mode runs production's code path: raw mode calls
  `createDumgen`'s `segment.inUnits` with the cached jev as its transport,
  and gold mode runs the unit stage under the same operation and call
  adapter (`src/evaluation/production-segmenter.ts`), since `createDumgen`
  takes no Segments. `--units reference` keeps the lab's port.
- **Transport is recorded apart from accuracy.** Every retry and every
  request that still failed is counted by cause (an HTTP status, `no
  status`, `invalid answer`), and requests abandoned with their operation
  as `interrupted`. An evaluate run gives the counts as `transport` in its
  ledger line and output, and each attempt's trace marks a call's
  `retries` and `error`; a lab `run` keeps them in `manifest.json` and its
  ledger line.

## Rounds

The main session grants jev spend per experiment round, in fresh input
tokens. `evidence/segment-in-units-lab/rounds.json` holds the rounds and
names the current one; `round` prints what it has spent and has left.

- Every ledger line names its `round`. A round's spend sums its own lines
  only, never the whole ledger. Lines written before rounds have none; the
  fill of fa59d50e was tagged with `2026-10-02-5usd`, which it opened.
- Ordinary runs stop at the round's stop line. The tokens between the
  stop line and the cap are the final held-out run's, which raises the
  line with `--token-budget <cap>`; nothing passes the cap.
- A live `run`, `noise`, `limit-qpc` or `evaluate` first prices itself: an
  offline pass answers each cache miss from the same request at another
  repetition, priced exactly, or with stand-in answers (a Choice's first
  option, a high Noul), priced by size from a fit of the cached requests.
  It refuses to start when the round's spend plus the price, its estimated
  part ×1.25, would cross the stop line, and stops at the line while it
  runs. `--estimate` prints the price and asks nothing.
- The pin: the unit stage's requests quote dumcorpus's Authored Inventories,
  so a peer edit to them changes prompts and misses the cache. A round
  records the last commit of `battery/dumcorpus/src` and a hash of the
  prompt inputs: the `dumcorpus/inventories` source with the modules it
  imports, and the Rules. Each run manifest and ledger line keeps the pin
  it read. A live run refuses to start when today's inputs differ from the
  round's pin, unless `--repin`, which pins the round at today's dumcorpus
  and keeps the old pin in `repins`. `replay` and offline runs report the
  drift. Pins taken before #881 hashed the built dist instead. No
  request quotes Rule text, so drift in `rules` alone still hits the
  cache, though `replay` warns that it misses. `round --repin` re-pins
  without running anything.

## Artifacts

The frozen sets are tracked, so a fresh clone can re-run any set, which
spends jev tokens, and score a run against the gold it ran on. An offline
replay (`--offline`, `replay`, gold-mode parity) needs the answer cache,
and comparing past runs needs their raw runs or outcomes; all of these
stay local. Raw runs, their outcomes, promptsmith exports and the answer
cache live in `.runs/segment-in-units-lab/`, which is gitignored. The
cache keeps one file per model, judge state and repetition under
`cache/jev-questions/`, with each answer keyed by its question. The
answers cached per request before that, under `cache/jev/` (about
300 MB), are no longer read: their keys used the `localeCompare` key
order that common-utils' `canonicalJson` replaced (#817), so jev answers
those requests once more; a run writes its outcomes to `outcomes/<runId>.jsonl.gz`
there, one row per (case, gold unit) with verdict letters per repetition
per policy. Commit the frozen sets, each run's manifest and summary, and
the ledger:

```text
evidence/segment-in-units-lab/
  ledger.jsonl               one line per model-calling command (run, noise, limit-qpc, evaluate) and per compare --record, each naming its round
  rounds.json                the rounds: budget, stop line and pin, and the current round
  sets/<name>@<hash>.json.gz every frozen set, read in place
  sets/current.json          the current hash of dev and of heldout
  runs/<runId>/
    manifest.json            provenance: see RunManifest in lab/provenance.ts
    diff.patch               only when run with --allow-dirty
    summary.json             report of the primary reading; summary--<variant>.json for others
    noise.json               noise reruns only: flip rates per policy and bucket
  summaries/                 reports of runs made before manifests (historical)
```

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
