---
status: accepted
---

# Build dictionary changes inside the committing transaction

A resolved occurrence and a generated-Knowledge publication each reach the
Shared Demo Dictionary through one mutation. That mutation loads the Dumdict
slice from its own transaction, plans with the same Dumdict planners the
Effect service runs, and applies the plan before the surrounding host writes.
The node action no longer prepares a plan across a query hop, carries it back
across a mutation hop, or retries on revision conflicts: the revision a plan
is built against is the revision it commits into, so Convex's optimistic
concurrency replaces the hand-written retry loop and the rollback plan
surgery that stripped relation operations at commit time.

The action keeps only the work that needs the node runtime: model execution
and the coalescing of Knowledge contributions. `knowledgeGeneration.begin`
claims a run and returns the occurrence, the accumulated Knowledge, and the
relation-publication authorization in one hop; `knowledgeGeneration.publish`
owns the publication sequence, drops changes the run already published,
rechecks the relation gate, and records evidence and attempt state. The
Resolution Session lifecycle adapter lives beside the session mutations and
times each hop where the hop is made, so the inspector's waterfall shows
transport cost instead of an unexplained gap.

The decision is driven by measured cost: every query or mutation call
evaluates its module in a fresh isolate context, so a request costs roughly
hops × module weight. Moving the planner into the transaction removes the
prepare hop and the child publication action; ADR-0025 removes the module
weight those hops paid for.

## Considered Options

- Keeping the planner in the action and only merging the query and mutation
  hops would have kept two plans on the wire and the retry loop.
- Deduplicating published changes in the action alone would have lost the
  changes a mutation committed after the action saw a transport error.

## Consequences

- `persistence.persistResolvedClick` receives the Reading decision, not a
  plan; `dumdictTransaction` exposes `addNewNote`, `ensureOwnedSurface`,
  `ensureReadingEntry`, and `applyGeneratedKnowledge` as plan-and-commit
  operations, and `dumdictStorage/planner.ts` is the mutation-side adapter of
  the storage seam next to the action-side `adapter.ts`.
- Whether Resolution Inspector capture is on travels in the scheduled
  action's arguments and captured steps are saved in one mutation, so tracing
  adds no hop to the path it observes.
- Navigation and Shadow cleanup actions still use the action-side adapter;
  they can move to mutations the same way when their latency matters.
