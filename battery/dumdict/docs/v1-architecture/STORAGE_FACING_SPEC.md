# Storage-facing port

> **Superseded terminology:** This document predates ADR 0002 and is retained
> as pre-refactor design history. Use `battery/dumdict/CONTEXT.md` and the
> generated package README for the current Lemma/Reading model and API.

Hosts implement `DumdictStoragePort<L>`.

## Read operations

- `findStoredMeanings({ linguisticEntryId })` returns Meaning records paired
  with their `LinguisticEntryRecord`.
- `loadMeaningForPatch({ meaningId })` returns one optional Meaning.
- `loadNewNoteContext({ draft })` returns existing Entry and Meaning records,
  colliding owned Surfaces, explicit relation targets, and relevant pending
  work.
- `getInfoForRelationsCleanup({ citationForm })` returns candidate Entries,
  pending refs, and pending relations.
- `loadCleanupRelationsContext({ resolutions })` returns the exact workset
  needed for a cleanup commit.

Every slice includes a `StoreRevision`. Dumdict validates references and
identities in loaded slices before planning.

## Commit operation

`commitChanges` receives one base revision and ordered semantic changes:

- create or patch a Linguistic Entry
- create or patch a Meaning
- create an owned Surface
- create or delete a pending ref
- create or delete a pending relation

Every change carries explicit preconditions such as revision match, entity
existence or absence, missing attestation, and pending-ref reachability.

The adapter must apply all changes atomically or return a conflict. It must not
silently garbage-collect pending refs or infer inverse relations; those are
explicit planned changes.

## Persisted aggregate

The reference test adapter serializes:

```ts
type SerializedDictionaryNote<L> = {
  linguisticEntryRecord: LinguisticEntryRecord<L>;
  meaningEntries: MeaningEntry<L>[];
  ownedSurfaceEntries: SurfaceEntry<L>[];
  pendingRefs?: PendingEntryRef<L>[];
  pendingRelations: PendingEntryRelation<L>[];
};
```

Production stores may normalize this differently as long as the port preserves
the same semantics.
