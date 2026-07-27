# dumdict V1 Testing Strategy

V1 service tests should exercise the same public service API that UI callers use,
while relying on an internal in-memory storage adapter instead of Obsidian,
SQLite, Electron, or a server.

## Goals

- keep tests close to real consumer usage
- keep storage behavior deterministic and inspectable
- avoid full application infrastructure in unit/service tests
- make pending-ref pickup and relation behavior easy to fixture
- keep language fixtures separate so language-specific DTOs stay clear

## Fixture Shape

Tests should start from serialized note fixtures.

There should be one fixture list per language:

```txt
tests/fixtures/en-notes.ts
tests/fixtures/de-notes.ts
tests/fixtures/he-notes.ts
```

Each file should export a list of serialized notes for that language.

```ts
export const enSerializedNotes = [
  /* SerializedDictionaryNote<"en"> */
];
```

The serialized note shape should be storage-facing enough to test adapter
behavior, but still semantic enough to avoid markdown or SQL details.

```ts
type SerializedDictionaryNote<L> = {
  lemmaEntry: LemmaEntry<L>;
  ownedSurfaceEntries: SurfaceEntry<L>[];
  pendingRelations: PendingLemmaRelation<L>[];
};
```

Pending refs may either be stored explicitly in the fixture or derived by the
in-memory storage from pending relations and their target refs. The important
property is that tests can represent unresolved relation targets and later
verify pickup behavior.

## In-Memory Storage

The test storage should implement the same `DumdictStoragePort<L>` that real
hosts implement:

```ts
type DumdictStoragePort<L> = {
  findStoredLemmaSenses(...): Promise<StoredLemmaSensesSlice<L>>;
  loadLemmaForPatch(...): Promise<LemmaPatchSlice<L>>;
  loadNewNoteContext(...): Promise<NewNoteSlice<L>>;
  commitChanges(...): Promise<CommitChangesResult>;
};
```

It may also expose testing-only helpers:

```ts
type InMemoryTestStorage<L> = DumdictStoragePort<L> & {
  loadAll(): SerializedDictionaryNote<L>[];
};
```

`loadAll()` is not product API. It exists so tests can assert final storage state
without going through UI-facing service methods that are unrelated to the test.

## Boot Helper

Every service-level test should boot `dumdict` through the same helper.

```ts
function getBootedUpDumdict<L extends SupportedLanguage>(
  language: L,
): {
  dict: DumdictService<L>;
  storage: InMemoryTestStorage<L>;
};
```

The helper should:

1. select the serialized note fixture list for the requested language
2. load that list into in-memory storage
3. create the configured `DumdictService`
4. return both the service and the storage test handle

Tests should call:

```ts
const { dict, storage } = getBootedUpDumdict("en");
```

Then use `dict` for behavior:

```ts
await dict.findStoredLemmaSenses({ lemmaDescription });
await dict.addAttestation({ lemmaId, attestation });
await dict.addNewNote({ draft });
```

And use `storage.loadAll()` only for final assertions that need full state.

## Test File Pattern

Each test file should:

1. call `getBootedUpDumdict(lang)`
2. interact through the UI-facing service API
3. assert user-visible results from service calls
4. inspect `storage.loadAll()` only when validating committed side effects

Tests should not construct ad hoc storage adapters in each file. Storage setup
belongs in the shared boot helper.

## What To Cover

The initial v1 suite should cover:

- `findStoredLemmaSenses` returns all stored senses for a coarse lemma
  description
- `addAttestation` appends to an existing lemma note
- `addAttestation` reports a missing lemma cleanly
- `addAttestation` reloads patch context and does not depend on stale lookup
  revision
- `addNewNote` creates a new lemma note
- `addNewNote` creates owned surfaces from the draft
- `addNewNote` rejects duplicate lemmas with `lemmaAlreadyExists`
- `addNewNote` rejects existing owned-surface collisions with
  `ownedSurfaceAlreadyExists`
- `addNewNote` adds explicit relations to existing lemmas
- `addNewNote` creates pending refs and pending relations for missing relation
  targets
- `addNewNote` picks up existing pending refs that match the inserted lemma
- pending pickup materializes inverse-paired resolved relations
- consumed pending relations are removed
- pending refs with no remaining incoming relations are removed through explicit
  `deletePendingRef` changes
- request DTOs and IDs with a language different from the configured service
  language fail before storage is called
- storage conflicts are surfaced through mutation results/errors

## Boundary Rule

Service tests should not test markdown serialization, SQL queries, or Electron
sync behavior. Those belong to host adapter tests.

The shared in-memory storage tests the `dumdict` contract:

```txt
UI-facing service API -> configured service -> storage-facing port
```

Host-specific tests should separately prove that a real host adapter implements
the same storage-facing port correctly.
