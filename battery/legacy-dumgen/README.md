# LegacyDumgen

The Dumgen pipeline as it stood before the `segment.inUnits` rewrite:
sentence analysis, target classification, segmentation, Grammatical
Resolution, Knowledge Production and Reading Emoji Description, with
`createDumgen`, its types and schemas, the authored selections, the legacy
experiments and the prototypes. tf-demo, the Laboratory, a Dumdict test and
the repository's Dum runtime audits import it as `legacy-dumgen` until they
are rewired.

It is frozen. Nobody patches it, its generated data is stale against the
current Dumling, and it stays red. It has no `check`, `lint` or `fix`
script, and its `test` and `validate` stages only print that it is frozen,
so the repository's gates skip it. `bun run check:frozen` counts its type
errors and `bun run test:frozen` runs its tests. `bun run build` still
emits its `dist`, declarations unchecked, so its importers keep
type-checking against it; there, `legacy-dumgen/development` loads the
legacy experiments from source and lists none while they fail to load.

[#701](https://github.com/clockblocker/texteater/issues/701) replaces it:
the new Dumgen in `battery/dumgen` is built from scratch, and the domain
language and ADRs, this pipeline's included, stay in
[`battery/dumgen`](../dumgen/CONTEXT.md). Delete this package once nothing
imports it.

## Historical run artifacts

Historical run artifacts were removed in the commit titled
`chore: archive historical Dumgen run artifacts in git history`.
The last complete snapshot is [commit `e5060a04`](https://github.com/clockblocker/texteater/tree/e5060a0407252f25af801f59674f47a5aff71e55/battery/dumgen-new/docs/prototypes).
It contains all 518 files formerly under `docs/prototypes/**/runs/`, including
outputs, scores and acceptance reservations. For example, inspect a deleted run
without restoring it into the worktree:

```sh
git show e5060a0407252f25af801f59674f47a5aff71e55:battery/dumgen-new/docs/prototypes/reading-resolution-meaning-isolation/runs/2026-08-22T06-06-42-740Z/results.json
```

Adjacent `.ts.txt` files preserve source evidence. The
[historical relation review](docs/prototypes/german-relation-human-gate/README.md)
records which inputs remain locally verifiable and which require retrieval from
Git history. Its candidate cannot qualify the current pipeline.
