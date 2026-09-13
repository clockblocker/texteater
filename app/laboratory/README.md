# Laboratory

Laboratory exposes Dumgen's segmentation, Target Classification, Grammatical
Resolution, and Reading production in a React/Vite workbench backed by a Bun
API. Its Evaluation runs view opens and compares the same Promptsmith records
as the Dumgen CLI.

```sh
OPENAI_API_KEY=... bun run --cwd app/laboratory dev
```

Open <http://127.0.0.1:5173/>, submit a German sentence, and select a
`ResolvableText` Segment. Intake uses the model; German segmentation is
deterministic. Subsequent stages share one Encounter. The resolution API also
accepts a supplied Analysis Target and skips classification for that request.
The API key stays in the server environment.

Readings and Surfaces are stored in an isolated, in-memory Dumdict. Repeated
clicks reuse completed results; a Reading failure keeps successful grammar
available for retry. Resetting the session clears this dictionary and cached
results while retaining earlier logs.

`DUMGEN_RUN_DIRECTORY` selects Evaluation run storage. Interactive JSONL logs
use its sibling `laboratory/sessions` directory, or
`LABORATORY_SESSION_DIRECTORY` when set. Defaults live outside the repository
in the user's data directory. Model exchanges, failures, and cached or authored
stages remain visible in each session record.
