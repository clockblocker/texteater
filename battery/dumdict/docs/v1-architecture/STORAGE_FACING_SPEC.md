# Storage-facing port

Hosts implement `DumdictStoragePort<L>`. Reads return operation-shaped slices
for exact Reading lookup, Reading patches, new-note planning, and pending
cleanup. Every slice includes a `StoreRevision` and Dumdict validates its
owners, languages, Knowledge schemas, and pending locators before planning.

`commitChanges` receives one base revision and ordered semantic changes:

- create a Lemma Record or Reading Entry;
- patch a Reading attestation or apply a Reading Knowledge Change;
- create an owned Surface;
- create or delete one exact Pending Semantic Relation record.

The adapter must apply every planned change atomically or return a conflict.
It must not infer inverse edges, auto-resolve Unit Shadows, or remove other
pending records.

## Version 1 wire aggregate

```ts
type SerializedDictionaryNote<L> = {
  schemaVersion: 1;
  lemmaRecord: LemmaRecord<L>;
  readingEntries: ReadingEntry<L>[];
  ownedSurfaceEntries: SurfaceEntry<L>[];
  pendingRelations: PendingSemanticRelationRecord<L>[];
};
```

The previous unversioned shape is version 0. The exported migration normalizes
and deduplicates direct Reading targets, moves them under Reading Knowledge,
and joins lexical pending relations to their descriptor refs. Duplicate,
missing, or orphan ref IDs; cross-language pending records; cross-language or
self direct edges; non-empty flat morphology; and morphological pending values
all fail through a typed, all-or-nothing migration error. Empty morphology is
omitted. Encounter `attestedTranslations` remain evidence and are never
inferred to be Target-Language Knowledge.
