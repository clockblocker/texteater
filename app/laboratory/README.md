# Laboratory

> EARLY-WIP prompt laboratory. It is not a production prompt namespace.

The laboratory exposes Dumgen's German intake, segmentation, target
classification, grammatical resolution, and Reading resolution stages in a
React/Vite UI backed by a Bun API.

```sh
OPENAI_API_KEY=... bun run --cwd app/laboratory dev
```

Open <http://127.0.0.1:5173/>, select one complete German sentence, and run
Intake plus Segmentation. Only `ResolvableText` Segments are clickable. The API
key stays in the server environment.

Intake and Segmentation are separate model calls. A click then follows the
Target, Grammatical, and Reading stages. Only German `Lexeme/NOUN` currently
reaches the last two stages; other valid targets stop at
`ResolutionRouteNotImplemented`.

Each server run appends JSONL events under
`battery/dumgen/.laboratory/sessions/<session-id>/events.jsonl`. Resetting the
session rotates its ID and clears in-memory results without deleting older
files.
