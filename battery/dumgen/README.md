# Dumgen

German `segment.inUnits` ([#701](https://github.com/clockblocker/texteater/issues/701),
[Dumgen ADR 0007](docs/adr/0007-segment-text-into-biggest-units-and-break-multiword-lemmas-down-apart.md)):
a Sentence's Segments go in, and its biggest units come back, each with its
route or `Unresolved`. This package is being rebuilt from scratch.

Its public entry exports `extractPastedText`, which turns pasted text into
the one Scroll of its Extracted Text, `extractedTextFromMarkdown`, which
reads a Markdown document into its Sections and Scrolls, and `splitScroll`,
which splits a Scroll into paragraphs and Sentences in code with the
language-neutral `splitText`.
`operations` holds Dumgen's operations, Effect 4 Effects that name the
models they need. `language.detect` judges each Sentence's Detected
Language, and `segment.inUnits` runs the German segmenter's stages under
`src/segment/` on each Sentence: the Segment stage cuts it into Segments,
and the unit stage groups and routes them. The stages reach jev only
through the host's `JevTransport` and read no files.
`segment.inConstituents` breaks a resolved Reading down one level, into
its immediate parts, and `segment.inMorphemes` splits a bottom word into
its morphemes (`src/segment/breakdown.ts`, `src/segment/de/breakdown/`);
code proposes the cuts and Canonical Forms, jev picks. `translate.sentence`
translates one German Sentence into `en` or `ru` through Luna, reading its
neighbouring Sentences as context. A host builds
`DumgenLive({ jev: JevTransport.typeSafe({ apiKey }), luna: LunaTransport.openAI({ apiKey }) })`
once per action and `Effect.provide`s it to the `operations` programs it
runs; both transports are a `fetch` with the host's key, and `fromAsk`
wraps a fake or the lab's cache instead. Everything under `src/`
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
