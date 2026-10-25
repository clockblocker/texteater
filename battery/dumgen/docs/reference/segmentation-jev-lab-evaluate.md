# German `segment.inUnits` evaluate runs

`cli/evaluate.ts` runs the production segmenter over the lab's frozen
sets, one experiment per set and mode, and saves a promptsmith run:

```sh
bun run evaluate --experiment segment-in-units/de:dev --revision <rev> --offline \
  [--units production|reference] [--parity <labRunId>[:policy]]
bun run evaluate --experiment segment-in-units/de:heldout:raw --revision <rev>
bun run evaluate --experiment segment-in-units/de:dev:raw --estimate
bun run evaluate --experiment split-text/de:ud-drafts --revision <rev>
bun run evaluate --experiment segment-in-units/de:dev --revision <rev> --requests
bun run evaluate --compare <beforeRequestRunId> <afterRequestRunId>
bun run evaluate --experiment segment-in-units/de:dev --revision <rev> \
  --cases <idsFile> | --cases-from <requestCompareJson>
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
  `lab/evaluation/ud-drafts` into paragraphs and Sentences, scored by
  sentence-boundary P/R/F1 in the Text's visible characters, so trimmed
  whitespace and joined hard wraps don't count. #738's Text Records will
  replace ud-drafts. Code splits; no model runs.
- Every mode reports membership, multi-piece membership and hover B-cubed
  as the lab does, over the repetitions that ran. Each case runs three
  times, answered from the lab's cache by repetition.
- **A case list** (`--cases <file>`, one case id per line, or
  `--cases-from <file>`, the `--compare` report of two request runs saved
  as JSON, whose `changed` cases it takes) runs a segment.inUnits
  experiment, gold or raw, on those cases of the current set alone. A
  case the set lacks fails the run. The manifest's settings keep the list
  as `caseList` (its ids and the hash of the sorted ids), and the ledger
  line keeps the hash as `caseList` and the count as `cases`. A round
  that measures a change runs its baseline and the change on the cases
  the request diff moved: every other case sends the same requests, so
  its outcomes can't move. Each evaluate command takes only the options
  it reads, and any other fails before it prices or asks anything: a
  segment.inUnits run reads none of `--limit`, `--subset`, `--repetitions`
  and `--gold-only` (the case list is how to run part of a set), and
  `--requests` reads no case selection or repetitions.
- A segment.inUnits run writes a ledger line (`command: "evaluate"`) and
  counts against the round like a lab run: `--estimate`, the stop line, the
  projection and the pin all apply. A live run fills the cache
  concurrently before promptsmith replays it case by case.
- The production mode runs production's code path: raw mode calls
  `operations.segment.inUnits` under `DumgenCore`, `DumgenLive` without its
  budget, with the cached jev as its transport, and gold mode runs the unit
  stage under the same operation and call adapter
  (`lab/evaluation/production-segmenter.ts`), since `operations` takes no
  Segments. `--units reference` keeps the lab's port.
- **One runtime and one budget per run** (Dumgen ADR 0009): every evaluate
  run's Effects run on one `ManagedRuntime` (`lab/evaluation/lab-runtime.ts`),
  whose request budget of 12 all its attempts share, the cache fill's and
  every experiment's alike. Each attempt builds `DumgenCore` over its own
  cached transports on that budget. SIGINT aborts the run's signal, which
  interrupts its attempts and aborts the calls in flight. Waits and
  latencies in runs from before this budget can't be compared with later
  ones; requests and outputs can.
- **The request diff** (`--requests`, `lab/evaluation/request-diff.ts`) is
  the free no-change check for a refactor. It builds every case's requests
  and each repetition's outcome offline and saves them under
  `.runs/dumgen/requests/`; `--compare` on two such runs lists the cases
  whose requests or outcomes differ and exits 1 if any do. It needs no
  cached answer for the change and no repin, so it works when dumcorpus
  has moved past the round's pin and every offline replay misses.
  segment.inUnits answers from the lab's cache and walks each case twice,
  answering a miss once as the projection does (a Choice's first option, a
  high Noul) and once with the contrary (its last option, a low Noul), so
  a cold cache still reaches the branches behind a "no" or a later option;
  every request and outcome is tagged with its path. `resolve-grammar/de:dev`
  and `:heldout`, `resolve-reading/de:*` and `knowledge/de:*` answer jev
  and Luna with their gold oracles, the licence judge's
  `knowledge/de:doublets:*` included. To compare two commits, run it in a
  checkout of each.
- **The request baselines** (`bun run request-baselines`,
  `cli/request-baselines.ts`, #1271) run every request diff above, with
  segment.inUnits under both `--units`, and an offline `replay` of the
  latest dev and held-out production lab runs, behind a guard that makes
  `fetch` throw and drops the provider keys. They save an index of the
  run ids under `.runs/dumgen/requests/baselines/` and print it.
  `--against <baselineId>` records them again, compares each request run
  and each replay's summary line with the baseline's, and exits 1 on any
  difference. The operations no experiment covers, `language.detect`,
  `translate.sentence` and `knowledge.accumulateTranslations`, have
  golden-request tests instead (`tests/golden-requests/`), whose fixtures
  a test run rewrites only with `DUMGEN_WRITE_GOLDEN=1`.
- **Transport is recorded apart from accuracy.** Every retry and every
  request that still failed is counted by cause (an HTTP status, `no
  status`, `invalid answer`), and requests abandoned with their operation
  as `interrupted`. An evaluate run gives the counts as `transport` in its
  ledger line and output, and each attempt's trace marks a call's
  `retries` and `error`; a lab `run` keeps them in `manifest.json` and its
  ledger line.

The lab itself, its rounds and its artifacts are in
[the lab reference](segmentation-jev-lab.md).

## The Breakdown segmenters

`segment-in-constituents/de:breakdown` and `segment-in-morphemes/de:breakdown`
score `segment.inConstituents` and `segment.inMorphemes` (Dumgen ADR 0007)
against dumcorpus's Breakdown Records (`lab/evaluation/breakdown/`).
The records dumcorpus's Breakdown held-out batches
(`batches/breakdown-heldout-*.json`) list form two held-out sets, each batch
naming its own in `set`: `segment-in-constituents/de:realtext`, the
headline, targets sampled at random from the sentences tf-demo's Learners
read with gold authored after sampling, and `:adversarial`, hard
homographs and edge cases, reported apart. `:breakdown` scores every other
record: prompts are tuned on `:breakdown` alone, and no held-out record is a
prompt's example (#693). `segment-in-morphemes/de` has the same three
sets, so a held-out bottom word is scored as unseen. Every
record without a Source is a constituents case, one holding a bottom word's
morphemes expecting none; a record holding a bottom word's morphemes is
also a morphemes case. A record with a Source is no case: the host asks
Knowledge for the Source first and runs no segmenter on such a Reading. A case passes when its pieces come back exactly; the
metrics add cut precision and recall, gold links placed, with gold's route
and exact, and agreement on whether there are Constituents at all, overall
and for phrasemes and words apart. `lenientExact` is the exact rate under
the noun-or-verb tolerance, which the user confirmed on #1241 on
2026-10-25: a compound's first part whose letters spell both a noun and a
verb's stem (`Segel` in `Segelboot`) passes linked to either.

They answer jev through the lab's cache, as segment.inUnits does, but count
against no lab round: a live run needs `--budget` (fresh jev input tokens),
the budget the user granted that round, prices itself first, refuses a
projection past it, and writes its spend, with its fresh requests per stage
(`stages`), to `evidence/segment-breakdown/ledger.jsonl`. While it runs, each
fresh request holds its projected price until it is over, and one that would
carry the spend and the requests in flight past the budget is refused. A
request no cache prices costs a shared overhead plus its characters at its
stage's rate, both fitted over this pass's cached requests and every
Breakdown line of that ledger (`lab/segmentation/harness/pricing.ts`).
`--cases` or `--cases-from`
take part of the set and `--repetitions` 1 to 3 (3 by default).

```sh
bun run --cwd battery/dumgen evaluate --experiment segment-in-constituents/de:breakdown --estimate
bun run --cwd battery/dumgen evaluate --experiment segment-in-constituents/de:breakdown --revision YOUR_COMMIT --budget TOKENS
bun run --cwd battery/dumgen evaluate --experiment segment-in-morphemes/de:breakdown --revision YOUR_COMMIT --offline
```
