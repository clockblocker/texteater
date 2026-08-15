# Dumdict architecture

Dumdict is semantic glue between learner dictionary workflows and host-owned
persistence. It does not call models and it does not own files, databases,
sync, or conflict UI.

A host creates one language-bound service with a storage adapter. The service
loads an operation-shaped slice, validates it, plans semantic changes with
preconditions, and asks the adapter to commit them atomically.

## Model

- `LemmaRecord` stores one Dumling Lemma and optional Lemma Knowledge.
- `ReadingEntry` stores one learner Reading, optional Reading Knowledge, and
  learner note evidence.
- `SurfaceEntry` stores one Dumling Surface and its owning Lemma.
- `PendingSemanticRelationRecord` stores a source Reading, a Dumrel Pending
  Semantic Relation, and an exact storage locator.

Knowledge is ownerless in Dumrel. Dumdict supplies the exact Lemma or Reading
owner, rejects owner/aspect mismatches, and omits empty Knowledge as storage
housekeeping. Semantic Relations live only under Reading Knowledge.

Pending Unit Shadows never auto-resolve. Inspection may find zero, one, or
many candidates; the caller must select one Reading or explicitly discard the
pending record. Acceptance writes the forward and inverse direct edges and
removes that exact pending record in one commit.

## Commitments

1. Hosts own persistence and transaction mechanics.
2. Dumdict owns Reading identity, owner applicability, exact matching,
   direct-self and same-language validation, inverse materialization, and
   pending lifecycle.
3. Normal operations load only their required slice.
4. Lemma, Reading, and Surface identities remain distinct.
5. Version 1 wire values carry `schemaVersion: 1`; version 0 migration is
   explicit and fails rather than guessing about unrepresentable morphology.
