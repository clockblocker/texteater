# UI-facing service

```ts
const dict = createDumdictService({ language: "en", storage });
```

- `findStoredReadings({ lemma })` returns zero or more learner Readings for one
  exact Dumling Lemma. Relation disambiguation is projected from each Reading's
  Knowledge.
- `addAttestation({ reading, attestation })` enriches one exact Reading Entry.
- `addNewNote({ draft })` stores a new Reading and optional owned Surfaces,
  direct Semantic Relations, or Pending Semantic Relations.
- `getInfoForRelationsCleanup({ canonicalForm })` returns candidate Lemmas and
  exact pending records without resolving them.
- `cleanupRelations({ baseRevision, resolutions })` accepts a caller-selected
  Reading or discards each exact pending record.

Mutations return `applied`, `conflict`, or `rejected`. Applied results include
base and next revisions plus affected Lemmas, Readings, Surfaces, and pending
target IDs. Conflicts are retryable storage or semantic-precondition failures;
rejections represent invalid domain requests.
