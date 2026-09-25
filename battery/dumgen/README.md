# Dumgen

Encounter-based linguistic production over Dumling and Dumrel. Import operations
from `dumgen`, structural types from `dumgen/types`, and composable authoring
schemas from `dumgen/schemas`. Execution is injected into `createDumgen`.

Prompt authoring follows the [prompting philosophy](docs/reference/human-owned/prompting-philosophy.md).

Developer experiments are available through `dumgen/development`:

```sh
bun run --cwd battery/dumgen evaluate --list
bun run --cwd battery/dumgen evaluate --experiment grammatical-resolution/de/lexeme/noun --revision YOUR_COMMIT --output .runs/dumgen
bun run --cwd battery/dumgen evaluate --open RUN_ID --output .runs/dumgen
```

Reading generation failures are often stochastic. `cli/sample-reading.ts`
samples selected held-out cases several times per prompt, optionally against
the prompt at a baseline revision, and reports pass, fail and review rates:

```sh
bun --env-file=.env.local battery/dumgen/cli/sample-reading.ts --baseline main --samples 6 --cases remain-closed,closed-tomorrow
```

`--model` and `--settings` configure text generation; `--judgment-model` and
`--judgment-timeout` configure bounded judgments. Live operations require
`OPENAI_API_KEY` and `TYPESAFE_API_KEY`. The `evaluate` script reads the
repository-root `.env.local` for any key the shell does not already export,
so a non-login shell can run it too; a missing file is ignored. Both transports
disable automatic retries. Laboratory's **Evaluation runs** view uses the same definitions
and immutable version-2 records, with separate domain results, failures and
TypeSafe/Luna calls. The four structured-Knowledge prototypes remain deferred
and retain version-1 evaluation. Its interactive workbench uses these same production operations
and session-scoped Dumdict storage.

Routine output belongs in the untracked `.runs/` directory, or the directory
selected by `DUMGEN_RUN_DIRECTORY`. Current experiments use the migrated corpora
and evaluators through `dumgen/development` and produce new Promptsmith
Evaluation Runs. Runs of experiments projected from dumspec also split their
scores by Review Status and write a disagreement list; see
[the evaluation reference](./docs/reference/evaluation.md).

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
