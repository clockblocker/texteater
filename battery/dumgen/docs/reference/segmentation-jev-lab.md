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
- `lab/segmentation/de/arms/` holds the three arms. `candidates4`
  (`--opt final=1 --opt closed=1`) outputs v3, step0, step0+saying and
  step0+saying+maxim@0.7, each step-0 policy also `+closed`; production is
  its `step0+saying+maxim@0.7+closed`. `production` runs the unit stage as
  `productionUnitSettings` sets it, so it follows a changed default, and
  takes #851's offline levers. Each lever policy is production with one
  knob changed and everything else as `productionUnitSettings` sets it,
  its later Choices and its `route-extra` routing included, so a variant
  that repeats production's own setting outputs and asks exactly what
  production does (`tests/lab/segmentation/production-arm.test.ts`). The
  stage asks each distinct request once per case, so variants share every
  request that comes out the same. The levers: `--opt grid=x1` (floors ×
  Saying assembly × step 0, no code rule, unasked groups `Unresolved`),
  `--opt pool=mean,median` (answers pooled across the cache's
  repetitions 0 to 2, `lab/segmentation/harness/pool.ts`), `--opt
  variants=<margins>` and `--opt x3=<rules>|all` (each code rule added to
  production's own, and all together; production applies all 14 of
  `codeRules` today, so this screens only a rule added to `codeRules`
  before production takes it) and `--opt
  x5=<floor>[-noabsorb][-sc],…` (the Locution Choice at each floor in
  place of production's; `sc` adds `saying-closed`, which production
  applies already; the Verb and Government Choices follow, so a variant
  whose membership differs asks its own `government` request) and `--opt
  verb=<floor>[-<family>…],…` (the Verb Choice at each floor over the
  families named, all five when none is, in place of production's; each
  family set asks its own `verb` request, and the Government Choice
  follows) and `--opt gov=<floor>[-<family>…],…` (the Government Choice
  at each floor over the families named, all six when none is, in place
  of production's; each family set asks its own `government` request
  over production's membership before its Government Choice).
  `reference` is the #755 reference.
  The retired arms and candidates4's other levers are at ec467e8d, and
  reference-floors at 5335f033.
- `lab/segmentation/harness/` holds the set freezing, the cached jev
  (`jev-cache.ts`), metrics, run evidence, the promptsmith export, the
  ledger and the rounds (`round.ts`). The CLI is
  `cli/segment-in-units-lab.ts`. The cached jev is a `JevAsk` over
  production's TypeSafe ask (`src/segment/typesafe-ask.ts`): it keys each
  answer by its question, so how a request is chunked never decides a
  hit, and it retries a fresh request that met a 429, a 5xx or no status,
  up to six times with backoff. Production never retries (#858, #871).
- `lab/evaluation/experiments.ts` is the table of experiments
  `cli/evaluate.ts` runs, in gold, raw and text mode
  ([Evaluate](segmentation-jev-lab-evaluate.md)). It
  reads the lab's sets and cache; `segment-in-units-raw.ts`,
  `source-evaluation.ts` and `split-text.ts` beside it score raw and text
  mode.
- Besides the production segmenter, the lab imports only the #731 harness
  (`lab/evaluation/spec-corpus/`), promptsmith and dumcorpus. Keep it that
  way. Typecheck it with `bun run check:segmentation` and test it with
  `bun run test tests/lab/segmentation`.
- Model calls go through jev (TypeSafe) only. The lab tracks tokens only.

## Commands

```sh
bun run segment-in-units-lab freeze                      # once; --force refreezes
bun run segment-in-units-lab run --arm candidates4 --subset slice300 --reps 3 \
  --opt final=1 --opt closed=1 --parent <runId> --hypothesis "<one line>"
bun run segment-in-units-lab replay --run <runId> [--request-budget 12]
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
  `lab/segmentation/harness/corpus.ts` keeps a record out of both sets while its gold waits for
  a person's approval.
- jev is pinned to `pinnedJevModel` in `src/segment/jev.ts`. `--model` picks another
  version. A floating alias needs `--allow-floating-model`. An answer from a
  version other than the one requested fails the call.
- `--offline` answers from the cache only. A cache miss becomes a case
  error. `--estimate` prices a `run`, `noise` or `limit-qpc` offline and
  stops (see Rounds). `--token-budget` moves the round's stop line, up to
  its cap.
- **One runtime and one request budget per command** (Dumgen ADR 0009,
  D4 on #1269): `run`, `noise`, `replay` and `limit-qpc` run their arms as
  Effects on one `ManagedRuntime` (`lab/evaluation/lab-runtime.ts`), and
  every jev request an arm asks through the cache's port holds one permit
  of its budget, hit or miss. `--request-budget` sets it (12 unless set);
  `--concurrency` still caps the cases worked on at once. A budget changes
  concurrency only, never requests or outputs. Runs record neither
  setting. A repetition's `wallMs` now includes its waits for a permit,
  and fewer requests in flight can change a fresh call's `latencyMs` (timed
  around the transport alone), so neither compares with runs made before
  #1276. Ctrl-C interrupts the run and aborts the requests in flight; the
  cache counts them `interrupted`.
- The `reference` arm takes its resolver floors as options (`--opt
  expression=0.6`; `floorsOf` in `arms/reference.ts`). Its default is the
  setting #762 adopted; `--opt floors=run` replays the #755 reference run.
  It pins the AUX inventory to the one its run read. `--opt
  unasked=unresolved` routes groups no batched route request asked about
  `Unresolved` instead of asking, so a setting runs offline. `sweep` reads
  every policy of a run against its baseline.

## Rounds

The main session grants jev spend per experiment round, in fresh input
tokens. `evidence/segment-in-units-lab/rounds.json` holds the rounds and
names the current one; `round` prints what it has spent and has left.

- `round --open` takes the grant in tokens. Its `--note` states tokens
  too, never dollars: the lab tracks tokens only, and a test rejects a
  dollar amount in committed evidence.
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
    manifest.json            provenance: see RunManifest in lab/segmentation/harness/provenance.ts
    diff.patch               only when run with --allow-dirty
    summary.json             report of the primary reading; summary--<variant>.json for others
    noise.json               noise reruns only: flip rates per policy and bucket
  summaries/                 reports of runs made before manifests (historical)
```

2026-10-22: one ledger run measured something other than its labels.
Production gained its Verb Choice at 566f7c04 and its Government Choice at
9c2d69e5, and the x5, verb and gov levers kept their old variants until
this date: an x5 variant ran neither Choice, a verb
variant asked one five-family `verb` request and ran no Government
Choice, and a gov variant ran a second Government Choice over
production's. Of the runs after 566f7c04, only
`20261002T122547--production--verb-0-6-0-5-lassen-recipient-state-0-6-lassen-recipient-state_x5-0-5-sc-0-6-sc-0-7-sc--heldout--all`
(1fcaadd3, after both) is affected: its `production+x5@…` and
`production+verb@…` policies are prefixes of production's stage, not
production with one Choice swapped, as `labLeverRun.note` in
`evidence/segment-in-units-heldout-final-20261002/attribution.json`
records. The gov runs from cf827b51 to b1047d77 ran before production had
a Government Choice, so each of their variants was production with that
one Choice added. `replay` of an x5, verb or gov run now reports
differences, and those levers' next live runs miss the cache.

## Evaluate and scoring

[Evaluate](segmentation-jev-lab-evaluate.md) covers `cli/evaluate.ts`'s
gold, raw and text modes over the lab's sets, and
[Scoring](segmentation-jev-lab-scoring.md) the metrics, the comparisons,
the noise floor and the refreezes.
