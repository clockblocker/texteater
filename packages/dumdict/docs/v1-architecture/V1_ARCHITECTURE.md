# dumdict V1 Architecture

## Role

`dumdict` is semantic glue between dictionary note storage and user-facing
applications.

It does not own persistence and it does not call LLMs. At setup time, a host
gives `dumdict` semantic storage functions. At runtime, UI code calls a small
task-oriented service API. The configured service loads the storage context it
needs, plans semantic changes, and asks the host storage port to apply them.

The intended consumers are:

- an Obsidian plugin that serializes entries into markdown files
- a Node server backed by SQLite for research-oriented dictionary data
- an Electron app backed by remote LLM/database services plus a local cache

## Specs

- [UI-facing spec](./UI_FACING_SPEC.md): the small API called by application/UI
  workflows.
- [Storage-facing spec](./STORAGE_FACING_SPEC.md): the setup-time storage port
  a host must implement.
- [Relations cleanup spec](./RELATIONS_CLEANUP_SPEC.md): explicit
  back-office workflow for pending-relation cleanup.
- [Unresolved target identity problem](./UNRESOLVED_TARGET_IDENTITY.md): why
  pending targets should not be modeled as degraded lemmas.
- [Testing strategy](./TESTING_STRATEGY.md): fixture and in-memory storage
  strategy for service tests.
- [Internal layers](./INTERNAL_LAYERS.md): proposed v1 module structure,
  contracts, planned operations, and semantic invariants.

## Intended Flow

1. An end user selects a word.
2. The UI performs lemma resolution through its own LLM flow.
3. The UI calls `dumdict.findStoredLemmaSenses(...)` with the resolved lemma
   description.
4. `dumdict` asks the storage port for stored senses matching that description
   and returns note-shaped candidates.
5. The UI asks its LLM whether one candidate matches the attested lemma.
6. If an existing candidate matches, the UI calls `dumdict.addAttestation(...)`.
7. If no candidate matches, the UI performs additional LLM calls to produce a
   full note draft and calls `dumdict.addNewNote(...)`.
8. `dumdict` loads the required storage context, plans semantic changes, and
   asks the storage port to commit them.

The UI owns LLM orchestration and context interpretation. `dumdict` owns
dictionary semantics.

## Core Commitments

1. `dumdict` is semantic authority, not persistence authority.
2. `dumdict` has two integration surfaces: a clean runtime service API and a
   setup-time storage port API.
3. Hosts own storage, sync, serialization, conflict UX, and LLM orchestration.
4. Normal user flows do not load the full dictionary.
5. `dumdict-core` works over operation-shaped dictionary slices.
6. In-memory state may be used as per-operation scratch/indexing, but not as a
   long-lived source of truth.
7. Missing related lemmas are represented as pending refs plus pending
   relations, not fake entries.
8. Pending refs are picked up by deterministic lemma identity matches.
9. Plans return semantic commands. Hosts translate those commands into their
   own storage writes.
10. Plans include semantic preconditions, not only revision checks.
11. IDs are derived by `dumling`. Hosts store IDs but do not mint them.
12. LLM output enters `dumdict` as typed `dumling` DTOs plus `dumdict`
    note/relation DTOs, not persistence-specific payloads.
13. Full-corpus/admin APIs are separate maintenance tools, not the normal app
    integration path.

## Layers

### UI Caller

Lives outside `dumdict`.

The UI/application workflow owns:

- UI events and user workflows
- LLM prompts and calls
- sentence, selection, and discriminator context

It calls `dumdict` through the small service API described in the
[UI-facing spec](./UI_FACING_SPEC.md).

### Configured Dumdict Service

The service is created once with a language, optional config, and a storage
port.

```ts
const dict = createDumdictService({
  language: "ru",
  storage,
});
```

The service orchestrates each operation:

1. validate that request DTOs and IDs match the configured service language
2. ask the storage port for the required semantic context
3. validate the loaded slice
4. plan semantic changes with `dumdict-core`
5. ask the storage port to commit those changes
6. return a clean result to the UI caller

### Storage Port

The storage port is supplied by the host at setup time.

It owns:

- persistence format
- sync and conflict UX
- database, file, or server access
- translation from semantic loads/writes into markdown, SQL, server calls, or
  another storage-specific operation

The storage port contract is described in the
[storage-facing spec](./STORAGE_FACING_SPEC.md).

### Semantic Core

`dumdict-core` owns:

- entry validation
- lookup normalization
- relation semantics
- inverse-paired relation maintenance
- pending unresolved targets
- planning from high-level intents to low-level semantic changes

The core shape should remain close to:

```ts
lookup(slice, request) -> LookupResult
planMutation(slice, intent) -> PlanMutationResult
validate(slice) -> Result
apply(slice, plan) -> nextSlice // reference/helper, not persistence
```

`dumdict-core` can remain exported for tests and advanced consumers, but the
main integration surface should be the configured service.

### In-Memory Storage

An in-memory storage implementation should exist as internal infrastructure.

It should implement the same storage-facing port as real hosts, and may also
have testing-only helpers such as `loadAll()`.

Its purpose is:

- service-level tests without Obsidian, SQLite, or Electron infrastructure
- fixtures for pending-ref pickup and relation behavior
- a reference storage adapter for the v1 port contract
- per-operation scratch/indexing where useful

It is not part of the public product API.

## Semantic Model Notes

Unresolved references are not fake lemma entries. They are represented as:

- `PendingLemmaRef`: the unresolved target identity
- `PendingLemmaRelation`: an edge from a real source lemma to that unresolved
  target

When a real lemma is inserted, `dumdict` checks whether existing pending refs
match the new lemma identity tuple. Matching pending relations are materialized
as resolved inverse-paired lemma relations, then removed. If a pending ref has no
remaining incoming pending relations after pickup, core emits an explicit
`deletePendingRef` change; storage does not garbage-collect it implicitly.

This pickup is deterministic. Pending ID derivation and pending pickup both use
the `dumling` lemma identity rules. Pickup is not based on LLM judgment or
spelling-only matching.
