# Dumgen

German `segment.inUnits` ([#701](https://github.com/clockblocker/texteater/issues/701),
[Dumgen ADR 0007](docs/adr/0007-segment-text-into-biggest-units-and-break-multiword-lemmas-down-apart.md)):
a Sentence's Segments go in, and its biggest units come back, each with its
route or `Unresolved`. This package is being rebuilt from scratch. Its
public entry exports `splitText`, which splits a Text into paragraphs and
Sentences in code, and `createDumgen({ jev }).segment.inUnits`, an Effect
4 Effect that runs the German segmenter's stages under `src/segment/` on
each Sentence: the Segment stage cuts it into Segments, and the unit stage
groups and routes them. The stages reach jev only through the host's
`JevAsk` and read no files; `createTypeSafeAsk` is the production `JevAsk`,
a `fetch` to the TypeSafe API with the host's key. Everything under `src/`
ships. Outside it, `lab/` holds what doesn't: the `segment.inUnits` jev lab
that configures and measures the stages (`lab/segmentation/`) and the
spec-corpus evaluator that scores them against dumcorpus
(`lab/evaluation/`). The CLIs under `cli/` run them, and `src/` never
imports `lab/`.

```sh
bun run --cwd battery/dumgen evaluate --list
bun run --cwd battery/dumgen evaluate --experiment segment-in-units/de:dev --revision YOUR_COMMIT --offline
bun run --cwd battery/dumgen evaluate --experiment segment-in-units/de:heldout:raw --estimate
bun run --cwd battery/dumgen evaluate --experiment split-text/de:ud-drafts --revision YOUR_COMMIT
bun run --cwd battery/dumgen evaluate --open RUN_ID
```

Gold mode feeds gold Segments to the unit stage, raw mode (`:raw`) cuts
the record's Sentence first, and text mode scores `splitText`.
`--offline` answers jev from the lab's cache only; without it, a cache miss
asks jev and needs `TYPESAFE_API_KEY`, which the `evaluate` script reads from
the repository-root `.env.local` when the shell does not export it, and the
run counts against the lab's current round. `--estimate` prices a run and
asks nothing. Each run is a Promptsmith run (`manifest.json`, `cases.jsonl`,
`summary.json`) in `--output`, `DUMGEN_RUN_DIRECTORY` or the untracked
`.runs/dumgen/`. The
[lab reference](docs/reference/segmentation-jev-lab.md) describes the
modes, the lab and its rounds.

Prompt authoring follows the
[prompting philosophy](docs/reference/human-owned/prompting-philosophy.md).
