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
clickable resolution path. Reading notes present the exact Reading's Knowledge
beside its Lemma. Dumdict stores semantic relations as Reading-owned edges to
target Lemmas and presents resolved targets as Lemma Route Notes. A target that
does not yet have an exact Lemma remains visible as a pending Shadow.

Occurrence Attestations, Readings, relations, and Knowledge belong to one
Shared Demo Dictionary. Selecting any member Segment of a committed occurrence
opens its universal Attestation and Reading without invoking Dumgen or creating
a Resolution Session. The anonymous Visitor owns at most one Visitor Encounter
per Segment.

The Dumgen actions read `OPENAI_API_KEY` from the Convex deployment. Set it once
without putting the secret in application code:

```sh
bun x convex env set OPENAI_API_KEY "$OPENAI_API_KEY"
```

## Reset demo data

Every page exposes the demo data controls. **Clear my data** removes only the
current Visitor's Encounter history, while **Clear shared data** removes the
universal linguistic graph and Shared Demo Dictionary. Both require
confirmation.

A stored Text page exposes **Strip analysis** while analysis exists, then
replaces it with **Analyze text** after stripping. Stripping preserves the Text
and its Sentences while removing their Segments, Attestation memberships,
occurrence Attestations, and Visitor Encounters.
A Reading remains when another Text still sources it; otherwise its Reading
Knowledge and source-owned relation edges are removed with it. Incoming edges
survive the loss of any target Reading and are removed only when the target
Lemma itself is removed. Any now-unshared Lemma and Surfaces are also removed.
Attestation identity is one occurrence-specific database ID. Equal reconstructed
Attestation values at different source occurrences remain distinct records.

The CLI also exposes the bounded full reset:

```sh
bun run reset
```

The bounded reset removes all tf-demo linguistic, Knowledge, Encounter, and
visitor context rows. The local deployment itself remains selected and reusable.

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
