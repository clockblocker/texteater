# Dumdict architecture

> **Superseded terminology:** This document predates ADR 0002 and is retained
> as pre-refactor design history. Use `battery/dumdict/CONTEXT.md` and the
> generated package README for the current Lemma/Reading model and API.

## Role

Dumdict is semantic glue between learner dictionary workflows and host-owned
persistence. It does not call LLMs and it does not own files, databases, sync,
or conflict UI.

A host creates one language-bound service with a storage adapter. The service
loads an operation-shaped slice, validates it, plans semantic changes with
preconditions, and asks the adapter to commit them.

## Model

- `LinguisticEntryRecord` stores one resolved Dumling Entry and its
  morphological relations.
- `MeaningEntry` stores one learner-owned Meaning and references its Entry by
  opaque `LinguisticEntryId`.
- `SurfaceEntry` stores one global normalized Surface and references the Entry
  it realizes.
- `PendingEntryRef` describes an unresolved relation target.
- lexical relations connect Meaning IDs.
- morphological relations connect Linguistic Entry IDs.

One Linguistic Entry may have multiple learner Meanings. Meaning content never
participates in Entry or Surface identity.

## Normal flow

1. The segmenter supplies indexed clickable text.
2. An upstream resolver turns the click into `Selection -> Surface ->
   LinguisticEntry`.
3. The application calls `findStoredMeanings({ linguisticEntryId })`.
4. If a returned Meaning fits, the application calls `addAttestation`.
5. Otherwise it calls `addNewNote` with the resolved Entry and new Meaning.

Entry candidate discovery is upstream work. `findStoredMeanings` never performs
coarse matching by Citation Form.

## Commitments

1. Hosts own persistence and transaction mechanics.
2. Dumdict owns relation pairing, pending-target pickup, validation, and
   semantic preconditions.
3. Normal operations load only their required slice.
4. Entry, Meaning, Surface, and Selection identities remain distinct.
5. Missing relation targets are pending descriptions, never fabricated Entries.
6. Plans use explicit create, patch, and delete operations.

See the adjacent UI, storage, cleanup, internal-layer, and testing specs.
