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

Every mutating service operation also accepts an optional `applyPlan` callback.
Dumdict invokes it only after the usual language checks, storage-slice
validation, and semantic planning. The callback receives a public readonly
`DumdictPlan` containing the base revision and ordered changes, so a database
adapter can apply it inside an existing host transaction together with related
host writes. When no callback is supplied, Dumdict delegates to the storage
port's `commitChanges` exactly as before. The selected adapter remains
responsible for checking the revision and every precondition and for publishing
neither dictionary nor host writes when it returns a conflict.

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
