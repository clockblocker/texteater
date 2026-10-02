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

Text intake needs `TYPESAFE_API_KEY` on the Convex deployment: Dumgen's
`segment.inUnits` asks jev for each Sentence's units. Convex actions read
deployment environment variables, not your shell or an `.env.local`, so
`bun run dev` first runs `bun run env:sync`. It pushes each key the
deployment reads from the first place that sets it: your shell, then
`app/tf-demo/.env.local`, then the repository root's `.env.local`, then a zsh
login shell, which finds exports in `~/.zshrc` when `bun run dev` starts from
a shell that never read it. Values are never printed. A key found nowhere
gets a boxed warning, the dev server starts anyway, and adding a text then
fails with "Intake isn't configured". No other provider key is needed while
click resolution is rebuilt
([#848](https://github.com/clockblocker/texteater/issues/848)): a click
selects its unit and calls no model.

The sync runs before `convex dev` starts the local backend, and
`convex env set` briefly starts a stopped backend to write the key, so a
fresh `bun run dev` picks the keys up. The local backend's Node actions keep
the environment they first loaded with, so restart `bun run dev` after
setting or changing a key while it runs. Restart once as well when
`convex dev` itself replaces the deployment after the sync: on the very first
run, or when a backend upgrade is answered with "start fresh", which wipes
its variables.

To set the key by hand, run this from `app/tf-demo`; omitting the value
prompts for it, which keeps the secret out of shell history:

```sh
bun x convex env set TYPESAFE_API_KEY
```

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
