# tf-demo

tf-demo is the end-to-end product probe for the Texteater packages. React and
Vite use a persistent local Convex deployment; there is no separate application
server.

## Develop locally

From the repository root:

```sh
bun install
bun run demo
```

The first run creates a local deployment and writes `VITE_CONVEX_URL` to
`.env.local`. Later runs reuse that deployment and its data.

Set the model key on the Convex deployment:

```sh
bun x convex env set OPENAI_API_KEY "$OPENAI_API_KEY"
```

Load the package-owned fixed inventory with `bun run load:fixed-members`. The
operation is idempotent and reports conflicting ordinary Reading Entry content.

Load the local Notes Study user and its normalized Dumling/Dumrel graph with
`bun run load:notes-study`. This explicit playground seed is idempotent and is
never loaded by a deployment automatically.

The application uses `/` as its canonical workspace URL. Deterministic UI
fixtures are available under `/playground`; Notes Study reads from the selected
local Convex deployment while keeping its extra presentation metadata in code.

## Reset and validate

The UI can clear Visitor Encounter history, clear the shared linguistic graph,
or strip derived analysis from one Text while preserving its source Sentences.
These operations require confirmation. `bun run reset` performs the bounded
full demo reset while keeping the local deployment selected.

From `app/tf-demo`:

```sh
bun run check
bun run lint
bun run test
bun run build
bun run validate
```
