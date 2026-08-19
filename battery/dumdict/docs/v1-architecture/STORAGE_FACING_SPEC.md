# Storage-facing port

Hosts implement `DumdictStoragePort<L>`. Reads return operation-shaped slices
for exact Reading lookup, Reading patches, new-note planning, and pending
cleanup. Every slice includes a `StoreRevision` and Dumdict validates its
owners, languages, Knowledge schemas, and pending locators before planning.
New-note and cleanup slices include the complete Lemma/Reading relation
inventory needed for synonym closure, inverse fan-out, and later-Reading
backfill; adapters must not rely on row order for ambiguous resolution.

`commitChanges` receives one base revision and ordered semantic changes:

- create a Lemma Record or Reading Entry;
- patch a Reading attestation or apply a Reading Knowledge Change;
- create an owned Surface;
- create or delete one exact Pending Semantic Relation record.

The adapter must apply every planned change atomically or return a conflict.
It must not infer inverse edges or resolve Unit Shadows; Dumdict includes all
materialized relation and exact pending-record operations in the atomic plan.

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

This is a hard-break wire contract. Dumdict exposes no compatibility migration
from the old unversioned, Reading-targeted relation shape. Hosts must reset or
explicitly rewrite old data outside Dumdict. Encounter `attestedTranslations`
remain evidence and are never inferred to be Target-Language Knowledge.
