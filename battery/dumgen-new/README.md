# Dumgen

Encounter-based linguistic production over Dumling and Dumrel. Import operations
from `dumgen`, structural types from `dumgen/types`, and composable authoring
schemas from `dumgen/schemas`. Execution is injected into `createDumgen`.

Developer experiments are available through `dumgen/development`:

```sh
bun run --cwd battery/dumgen-new evaluate --list
bun run --cwd battery/dumgen-new evaluate --experiment grammatical-resolution/de/lexeme/noun --revision YOUR_COMMIT --output .runs/dumgen
bun run --cwd battery/dumgen-new evaluate --open RUN_ID --output .runs/dumgen
```

`--model` and `--settings` override execution configuration. Model runs require
`OPENAI_API_KEY`. Laboratory's **Evaluation runs** view uses the same definitions
and records. Its interactive workbench uses these same production operations
and session-scoped Dumdict storage.

Routine output belongs in the untracked `.runs/` directory, or the directory
selected by `DUMGEN_RUN_DIRECTORY`. Retained historical evaluations live in
`docs/prototypes/**/runs/`. Their original outputs, scores and hashes are
preserved; adjacent `.ts.txt` files are frozen source, not runnable commands.
Current experiments use the migrated corpora and evaluators through
`dumgen/development` and produce new Promptsmith Evaluation Runs.

The [historical relation review](docs/prototypes/german-relation-human-gate/README.md)
keeps an explicit artifact-location map and cannot qualify the replacement
pipeline without new evaluation and review.
