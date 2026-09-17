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

From `app/tf-demo`, set both provider credentials on the Convex deployment.
Omit the values to enter them interactively without putting secrets in shell
history:

```sh
bun x convex env set OPENAI_API_KEY
bun x convex env set TYPESAFE_API_KEY
```

Convex actions read deployment environment variables. Keys in your shell or
the repository's `.env.local` are not automatically available there. TypeSafe
is required during text intake; OpenAI is also required for generated
resolution. Configure both again when switching to a new deployment.

The dictionary starts empty. Dumgen supplies reviewed Units and Knowledge on
demand; grammatical navigation adds only the selected Reading.

The Notes playground uses an isolated in-memory fixture database. Fixtures
are never loaded into the application’s Convex deployment.

The application uses `/` as its canonical workspace URL. Shared tokens, theme
machinery, and presentation components come from the `lego` battery.

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
