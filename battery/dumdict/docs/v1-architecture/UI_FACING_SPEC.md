# UI-facing service

```ts
const dict = createDumdictService({ language: "en", storage });
```

- `findStoredReadings({ lemma })` returns zero or more learner Readings for one
  exact Dumling Lemma. Relation disambiguation is projected from each Reading's
  Knowledge.
- `addAttestation({ reading, attestation })` enriches one exact Reading Entry.
- `addNewNote({ draft })` stores a new Reading and optional owned Surfaces,
  direct Lemma-targeted Semantic Relations, or generated Unit Shadows. Exact
  Shadow matches resolve during planning; zero matches remain pending.
- `getInfoForRelationsCleanup({ canonicalForm })` returns candidate Lemmas and
  exact pending records without resolving them.
- `cleanupRelations({ baseRevision, resolutions })` retries exact pending
  locators using deterministic code-only Lemma resolution.

Mutations return `applied`, `conflict`, or `rejected`. Applied results include
base and next revisions plus affected Lemmas, Readings, Surfaces, and pending
target IDs. Conflicts are retryable storage or semantic-precondition failures;
rejections represent invalid domain requests.
