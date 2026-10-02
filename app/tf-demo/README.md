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

From `app/tf-demo`, set the TypeSafe credential on the Convex deployment.
Omit the value to enter it interactively without putting the secret in shell
history:

```sh
bun x convex env set TYPESAFE_API_KEY
```

Convex actions read deployment environment variables. Keys in your shell or
an `.env.local` are not automatically available there. `bun run dev` runs
`bun run env:sync`, which pushes `TYPESAFE_API_KEY` from the first place that
sets it: your shell, then `app/tf-demo/.env.local`, then the repository root's
`.env.local`. When none sets it, the sync prints a boxed warning and leaves the
deployment's key as it was. TypeSafe is required during text intake, where
Dumgen's `segment.inUnits` asks jev for each Sentence's units; a deployment
without the key rejects every new text with "Intake isn't configured". No
other provider key is needed while click resolution is rebuilt
([#848](https://github.com/clockblocker/texteater/issues/848)): a click
selects its unit and calls no model. Configure the key again when switching
to a new deployment, including a local backend started fresh. The local
backend's Node actions keep the environment they first loaded with, so
restart `bun run dev` after setting or changing a key.

Two deployment flags open anonymous entry points that a hosted deployment
must keep closed. `bun run dev` sets both to `1` on the local deployment
through `bun run env:sync`:

- `TF_DEMO_ADMIN=1` allows the global wipes, clearing shared data and
  stripping every analysis, and shows their buttons.
- `TF_INSPECTION=1` honours requests to capture Resolution Inspector records.

The dictionary starts empty. While click resolution is rebuilt, a click adds
nothing to it; grammatical navigation adds only the selected Reading.

The Notes playground uses an isolated in-memory fixture database. Fixtures
are never loaded into the application’s Convex deployment.

The application uses `/` as its canonical workspace URL. Shared tokens, theme
machinery, and presentation components come from the `lego` battery.

## Reset and validate

The UI can clear Visitor Encounter history, clear the shared linguistic graph,
or strip derived analysis from one Text while preserving its source Sentences.
These operations require confirmation, and the two shared ones need
`TF_DEMO_ADMIN=1`. `bun run reset` performs the bounded full demo reset while
keeping the local deployment selected.

From `app/tf-demo`:

```sh
bun run check
bun run lint
bun run test
bun run build
bun run validate
```
