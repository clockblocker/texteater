# Dumdict architecture

Dumdict is semantic glue between learner dictionary workflows and host-owned
persistence. It does not call models and it does not own files, databases,
sync, or conflict UI.

A host creates one language-bound service with a storage adapter. The service
loads an operation-shaped slice, validates it, plans semantic changes with
preconditions, and asks the adapter to commit them atomically.

## Model

- `LemmaRecord` stores one Dumling Lemma and no Knowledge.
- `ReadingEntry` stores one learner Reading, optional Reading Knowledge, and
  learner note evidence.
- `SurfaceEntry` stores one Dumling Surface and its owning Lemma.
- `PendingSemanticRelationRecord` stores a source Reading, a Dumrel Pending
  Semantic Relation, and an exact storage locator.

Knowledge is ownerless in Dumrel and always belongs to an exact Reading when
applied by Dumdict. Dumdict rejects owner mismatches and omits empty Knowledge
as storage housekeeping.

Semantic Relation buckets are Reading-owned and Lemma-targeted. Generated Unit
Shadows resolve only when one exact descriptor match exists. Zero or multiple
matches remain pending and inert. Only direct claims are durable; inverse,
closure, substitution, and later-Reading consequences are provenance-bearing
read projections.

Each Reading Knowledge value uses one homogeneous target mode. Lemma Target
Mode is the default for generated and open-class relations. Hand-maintained
closed inventories may opt into exact Reading targets; they do not use pending
Unit Shadows.

## Commitments

1. Hosts own persistence and transaction mechanics.
2. Dumling owns the foundational Reading value and stable identity operation;
   Dumdict owns dictionary scope, owner applicability, exact matching,
   direct same-Lemma and same-language validation, graph-wide target
   conflicts, inferred projection, and pending lifecycle.
3. Normal operations load only their required slice.
4. Lemma, Reading, and Surface identities remain distinct.
5. Version 1 wire values carry `schemaVersion: 1`; older shapes require a reset
   or host-owned rewrite and have no compatibility path in Dumdict.
