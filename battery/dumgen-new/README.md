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
and records. Its interactive dictionary workbench remains on `gumgen-old` until
the separate application/dictionary migration.

Routine output belongs in the untracked `.runs/` directory, or the directory
selected by `DUMGEN_RUN_DIRECTORY`. For evidence worth retaining, deliberately
choose a tracked output directory and commit the complete run. Existing expensive
evidence remains in `battery/gumgen-old/docs/prototypes/**/runs/`; its paths and
contents are preserved.
