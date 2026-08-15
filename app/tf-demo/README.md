# tf-demo

`tf-demo` is the smallest end-to-end product probe for the Texteater packages.
It runs React and Vite against a persistent anonymous Convex deployment on the
local machine. Convex is the backend and orchestrator; there is no separate
application server.

## Develop locally

From the repository root, install the Bun workspace and start both Convex and
Vite:

```sh
bun install
bun run demo
```

The first run creates and selects a local Convex deployment. Convex stores its
data locally and writes the generated `VITE_CONVEX_URL` to `.env.local` before
starting Vite. Later runs select the same local deployment, so data survives
process restarts.

After resolving a Segment, the workspace exposes the persisted Text, Sentence,
Segment, grammatical Attestation and Surface, Lemma features, and Reading as a
clickable resolution path. Reading notes combine Reading Knowledge with Lemma
Knowledge. Resolve more than one Reading to create validated semantic relations
between them and follow those relations from note to note; unresolved Dumdict
relations remain visible as pending targets.

Resolved Segment Contexts, Readings, relations, and Knowledge belong to one
Shared Demo Dictionary. Repeating a Click on the same Segment in the same
immutable Segmented Sentence reuses that universal result without invoking
Dumgen again. The anonymous Visitor owns only Click history.

The Dumgen actions read `OPENAI_API_KEY` from the Convex deployment. Set it once
without putting the secret in application code:

```sh
bun x convex env set OPENAI_API_KEY "$OPENAI_API_KEY"
```

## Reset demo data

The page footer separates the two destructive demo operations: **Clear my
data** removes only the current Visitor's Click history, while **Clear shared
data** removes the universal linguistic graph and Shared Demo Dictionary.
Both require confirmation.

The CLI also exposes the bounded full reset:

```sh
bun run reset
```

The bounded reset removes all tf-demo linguistic, Knowledge, click, and visitor
context rows. The local deployment itself remains selected and reusable.

## Validation

Run the package checks from `app/tf-demo`:

```sh
bun run check
bun run lint
bun run test
bun run build
bun run validate
```

`bun run validate` applies the repository-wide format, lint, type,
dependency, test, and architecture checks to this package.

## Frontend stack

The root provider connects `ConvexReactClient` to TanStack Query through
`@convex-dev/react-query`, then exposes both the Convex and TanStack providers
to the React tree. UI primitives live in `src/components/ui` and are managed
with shadcn using the repository's Bun package runner.
