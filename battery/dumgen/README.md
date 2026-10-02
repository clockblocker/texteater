# Dumgen

German `segment.inUnits` ([#701](https://github.com/clockblocker/texteater/issues/701),
[Dumgen ADR 0007](docs/adr/0007-segment-text-into-biggest-units-and-break-multiword-lemmas-down-apart.md)):
a Sentence's Segments go in, and its biggest units come back, each with its
route or `Unresolved`. This package is being rebuilt from scratch. Today it
holds the `segment.inUnits` jev lab, the spec-corpus evaluator that scores
it against dumspec, and the evaluation CLI. The legacy pipeline, with
`createDumgen`, moved to [`legacy-dumgen`](../legacy-dumgen/README.md),
where it stays frozen.

```sh
bun run --cwd battery/dumgen evaluate --list
bun run --cwd battery/dumgen evaluate --experiment segment-in-units/de:dev --revision YOUR_COMMIT --offline
bun run --cwd battery/dumgen evaluate --open RUN_ID
```

`--offline` answers jev from the lab's cache only; without it, a cache miss
asks jev and needs `TYPESAFE_API_KEY`, which the `evaluate` script reads from
the repository-root `.env.local` when the shell does not export it. Runs go
to `--output`, `DUMGEN_RUN_DIRECTORY` or the untracked `.runs/dumgen/`; the
[evaluation reference](docs/reference/evaluation.md) describes them, and the
[lab reference](docs/reference/segment-in-units-jev-lab.md) describes the lab.

Prompt authoring follows the
[prompting philosophy](docs/reference/human-owned/prompting-philosophy.md).
