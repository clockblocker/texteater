# Internal layers

> **Superseded terminology:** This document predates ADR 0002 and is retained
> as pre-refactor design history. Use `battery/dumdict/CONTEXT.md` and the
> generated package README for the current Lemma/Reading model and API.

## DTO layer

Defines persisted Entry, Meaning, Surface, pending-work, draft, relation, and
revision types. Lexical relations belong to Meanings; morphological relations
belong to Linguistic Entries.

## Service layer

Validates language-bound inputs, requests an operation-shaped storage slice,
validates that slice, delegates to the semantic core, commits planned changes,
and maps commit outcomes to public results.

## Semantic core

- `lookupStoredMeanings` maps validated Meaning slices to UI candidates.
- `planAddNewNote` plans Entry, Meaning, Surface, relation, and pending-work
  mutations.
- `planAppendMeaningAttestation` plans learner evidence updates.
- `planCleanupRelations` materializes or discards pending relations.
- relation rules own family classification and inverse pairs.

The core is pure: it receives DTOs and returns results or planned changes.

## Storage boundary

The storage port exposes semantic reads and one atomic commit. Planned changes
distinguish Entry creation and patching from Meaning creation and patching.
Preconditions cover revisions and every entity reference needed to prevent
partial or stale writes.

## Reference adapter

The in-memory adapter is internal test infrastructure. It implements the full
port, applies planned operations transactionally to cloned state, and exposes
`loadAll()` only for assertions.
