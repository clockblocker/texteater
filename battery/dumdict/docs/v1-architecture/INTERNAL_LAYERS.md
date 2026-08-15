# Internal layers

## DTO layer

Defines persisted Lemma, Reading, Surface, pending-work, draft, Knowledge
owner-envelope, and revision types. Dumrel types are imported deliberately;
the Dumdict barrel does not wildcard re-export Dumrel.

## Service layer

Validates language-bound inputs, requests an operation-shaped storage slice,
validates that slice, delegates to the semantic core, commits planned changes,
and maps commit outcomes to public results.

## Semantic core

- `applyDumdictKnowledgeChange` checks the exact owner and applies one
  owner-compatible Dumrel Knowledge Change.
- `planAddNewNote` plans Lemma, Reading, Surface, direct Semantic Relation, and
  pending-work mutations.
- `planAppendReadingAttestation` plans learner evidence updates.
- `planCleanupRelations` accepts or discards exact pending records.

The core is pure: it receives DTOs and returns results or planned changes.

## Storage boundary

The storage port exposes semantic reads and one atomic commit. Preconditions
cover revisions and every entity or pending locator needed to prevent partial
or stale writes. The in-memory reference adapter applies the same planned
operations transactionally to cloned state.
