# dumdict V1 Internal Layers

This document sketches the internal v1 module structure behind the public
service and storage-facing contracts.

The goal is to keep three boundaries clear:

1. UI callers see task-oriented service methods only.
2. Host adapters implement storage loads and atomic semantic commits only.
3. `dumdict-core` owns validation, semantic planning, relation rules, pending
   pickup, and reference application of plans to slices.

## Proposed Source Tree

```txt
src/
  index.ts

  public/
    service.ts
    results.ts
    errors.ts
    diagnostics.ts

  dto/
    entries.ts
    notes.ts
    relations.ts
    pending.ts
    drafts.ts
    revisions.ts

  service/
    create-dumdict-service.ts
    language-guard.ts
    find-stored-lemma-senses.ts
    add-attestation.ts
    add-new-note.ts
    result-mapping.ts

  storage/
    port.ts
    slices.ts
    commit.ts

  core/
    intents.ts
    lookup.ts
    plan-mutation.ts
    validate-slice.ts
    apply-plan.ts
    planned-changes.ts
    preconditions.ts
    affected.ts
    summaries.ts

  core/relations/
    lexical.ts
    morphological.ts
    inverse-rules.ts
    relation-ops.ts

  core/pending/
    identity.ts
    pending-refs.ts
    pending-relations.ts
    pickup.ts

  testing/
    in-memory-storage.ts
    serialized-note.ts
    boot.ts
```

`src/index.ts` should export the configured service API and public DTOs. It
should not export storage test helpers. `dumdict-core` helpers may be exported
from a secondary path later if there is a concrete advanced-consumer need.

## DTO Groups

### Public Service DTOs

Owned by `public/` and `dto/`.

```ts
type DumdictService<L> = {
  findStoredLemmaSenses(
    request: FindStoredLemmaSensesRequest<L>,
  ): Promise<FindStoredLemmaSensesResult<L>>;

  addAttestation(
    request: AddAttestationRequest<L>,
  ): Promise<MutationResult<L>>;

  addNewNote(
    request: AddNewNoteRequest<L>,
  ): Promise<MutationResult<L>>;
};
```

Public request DTOs should be small and workflow-shaped:

- `FindStoredLemmaSensesRequest`
- `AddAttestationRequest`
- `AddNewNoteRequest`
- `DumdictEntryDraft`
- `OwnedSurfaceDraft`
- `ProposedRelation`
- `ProposedRelationTarget`

Public result DTOs should hide storage slices and planned ops:

- `FindStoredLemmaSensesResult`
- `LemmaSenseCandidate`
- `LemmaNoteForDisambiguation`
- `MutationResult`
- `MutationConflictCode`
- `MutationRejectedCode`
- `AffectedDictionaryEntities`
- `MutationSummary`
- `DumdictDiagnostic`

### Semantic Entity DTOs

Owned by `dto/`.

These are storage-agnostic semantic records:

- `LemmaEntry`
- `SurfaceEntry`
- `RelationNotesForDisambiguation`
- `PendingLemmaRef`
- `PendingLemmaRelation`
- `PendingLemmaIdentity`
- `StoreRevision`

These DTOs may contain `dumling` DTOs and IDs. They must not contain markdown,
SQL rows, filesystem paths, remote object IDs, or host-specific metadata.

### Storage Port DTOs

Owned by `storage/`.

```ts
type DumdictStoragePort<L> = {
  findStoredLemmaSenses(
    request: FindStoredLemmaSensesStorageRequest<L>,
  ): Promise<StoredLemmaSensesSlice<L>>;

  loadLemmaForPatch(
    request: LoadLemmaForPatchRequest<L>,
  ): Promise<LemmaPatchSlice<L>>;

  loadNewNoteContext(
    request: LoadNewNoteContextRequest<L>,
  ): Promise<NewNoteSlice<L>>;

  commitChanges(request: CommitChangesRequest<L>): Promise<CommitChangesResult>;
};
```

The slice DTOs are operation-shaped:

- `StoredLemmaSensesSlice`
- `LemmaPatchSlice`
- `NewNoteSlice`

They should contain enough semantic context for one operation, not a full
dictionary snapshot.

### Core DTOs

Owned by `core/`.

```ts
type DictionaryIntent<L> =
  | AppendLemmaAttestationIntent<L>
  | AddNewNoteIntent<L>;

type PlanMutationResult<L> = {
  baseRevision: StoreRevision;
  intent: DictionaryIntent<L>;
  changes: PlannedChangeOp<L>[];
  affected: AffectedDictionaryEntities<L>;
  summary: MutationPlanSummary;
  diagnostics?: DumdictDiagnostic[];
};
```

The minimum v1 planned-op union should be concrete, not `type: string` inside
implementation:

```ts
type PlannedChangeOp<L> =
  | CreateLemmaOp<L>
  | PatchLemmaOp<L>
  | CreateOwnedSurfaceOp<L>
  | CreatePendingRefOp<L>
  | DeletePendingRefOp<L>
  | CreatePendingRelationOp<L>
  | DeletePendingRelationOp<L>;
```

Every op carries `preconditions: ChangePrecondition<L>[]`.

## Planned Change Contracts

### `createLemma`

Payload:

- full `LemmaEntry`

Required preconditions:

- `revisionMatches`
- `lemmaMissing`

### `patchLemma`

Payload:

- `lemmaId`
- append-only or set-like patch operations for note fields and relation maps

Required preconditions:

- `revisionMatches`
- `lemmaExists`
- operation-specific preconditions such as `lemmaAttestationMissing`

Relation patch ops must be idempotent at the semantic level. If the same
relation is already present, planning should either omit the patch or rely on a
precondition that turns the commit into a semantic conflict.

### `createOwnedSurface`

Payload:

- full `SurfaceEntry`

Required preconditions:

- `revisionMatches`
- `lemmaExists` for `ownerLemmaId`
- `surfaceMissing`

`addNewNote` creates owned surfaces only. If the loaded slice already contains a
derived owned-surface ID, the service rejects before planning with
`ownedSurfaceAlreadyExists`.

### `createPendingRef`

Payload:

- full `PendingLemmaRef`

Required preconditions:

- `revisionMatches`
- `pendingRefMissing`, unless the loaded slice already found the same pending
  ref and the plan only needs to add another relation to it

### `createPendingRelation`

Payload:

- full `PendingLemmaRelation`

Required preconditions:

- `revisionMatches`
- `lemmaExists` for `sourceLemmaId`
- `pendingRefExists` for `targetPendingId`
- `pendingRelationMissing`

### `deletePendingRelation`

Payload:

- full `PendingLemmaRelation`

Required preconditions:

- `revisionMatches`
- `pendingRelationExists`

### `deletePendingRef`

Payload:

- `pendingId`

Required preconditions:

- `revisionMatches`
- `pendingRefExists`
- `pendingRefHasNoIncomingRelations`

Pending refs are never garbage-collected by storage. Core must explicitly plan
`deletePendingRef` after consumed pending relations are deleted.

## Authoritative Preconditions

The v1 `ChangePrecondition` union is authoritative and belongs in
`core/preconditions.ts`:

```ts
type ChangePrecondition<L> =
  | { kind: "revisionMatches"; revision: StoreRevision }
  | { kind: "lemmaExists"; lemmaId: DumlingId<"Lemma", L> }
  | { kind: "lemmaMissing"; lemmaId: DumlingId<"Lemma", L> }
  | { kind: "surfaceExists"; surfaceId: DumlingId<"Surface", L> }
  | { kind: "surfaceMissing"; surfaceId: DumlingId<"Surface", L> }
  | { kind: "pendingRefExists"; pendingId: PendingLemmaId<L> }
  | { kind: "pendingRefMissing"; pendingId: PendingLemmaId<L> }
  | {
      kind: "pendingRelationExists";
      relation: PendingLemmaRelation<L>;
    }
  | {
      kind: "pendingRelationMissing";
      relation: PendingLemmaRelation<L>;
    }
  | {
      kind: "pendingRefHasNoIncomingRelations";
      pendingId: PendingLemmaId<L>;
    }
  | {
      kind: "lemmaAttestationMissing";
      lemmaId: DumlingId<"Lemma", L>;
      value: string;
    };
```

Storage adapters must evaluate these preconditions against their persistence
model during `commitChanges(...)`.

## Layer Contracts

### Configured Service

The service layer owns orchestration and public error mapping:

1. validate request DTO and ID language against configured service language
2. call the matching storage load method
3. validate the loaded slice shape and language
4. call core lookup or planning
5. reject expected semantic failures as `MutationResult`
6. pass planned changes to `commitChanges`
7. map commit conflicts into `MutationResult`

Language mismatches throw a typed `DumdictLanguageMismatchError` before storage
is called. They are programmer/configuration errors, not user-edit conflicts.

### Core

Core functions are pure over DTOs:

```ts
lookup(slice, request) -> LookupResult
validateSlice(slice) -> Result
planMutation(slice, intent) -> PlanMutationResult | Rejection
applyPlan(slice, plan) -> nextSlice
```

Core must not:

- call storage
- know about markdown, SQL, Obsidian, Electron, HTTP, or caches
- throw for expected semantic rejections
- mutate input slices in place

### Storage Adapter

Storage adapters own query translation and atomic commit:

- load operation-shaped slices
- translate planned semantic ops into host writes
- evaluate all op preconditions
- commit atomically or return conflict
- preserve `dumling` IDs supplied by core

Storage adapters must not:

- mint `dumling` IDs
- invent inverse relations
- infer pending pickup
- garbage-collect pending refs implicitly
- call LLMs

### In-Memory Test Storage

The in-memory adapter implements the real storage port plus test helpers:

```ts
type InMemoryTestStorage<L> = DumdictStoragePort<L> & {
  loadAll(): SerializedDictionaryNote<L>[];
};
```

It should be boring and strict: the same planned ops and preconditions that a
host adapter receives should be used by service tests.

## Semantic Invariants

### Language

- A configured service has exactly one language.
- Every request DTO, nested `dumling` DTO, and `dumling` ID must match that
  language before storage is called.
- Loaded storage slices must contain only entities in the configured language.

### IDs

- Lemma and surface IDs are derived by `dumling`.
- Pending lemma IDs are derived from the same `dumling` identity rules used for
  pending pickup.
- Hosts store IDs but do not mint them.

### Entries

- A `LemmaEntry.id` must equal the ID derived from `LemmaEntry.lemma`.
- A `SurfaceEntry.id` must equal the ID derived from `SurfaceEntry.surface`.
- A `SurfaceEntry.ownerLemmaId` must point to an existing lemma when committed.
- `addNewNote` rejects an existing lemma ID and existing owned-surface IDs.

### Relations

- Resolved lemma relations are stored as inverse pairs.
- Core owns inverse relation rules.
- Storage applies relation patches exactly as planned.
- Self-relations are rejected before commit.
- Explicit existing relation targets must exist in the loaded slice; missing
  targets reject with `relationTargetMissing`.

### Pending Refs

- Missing relation targets are represented as `PendingLemmaRef` plus
  `PendingLemmaRelation`.
- Pending refs are not fake `LemmaEntry` records.
- Pending relations always start from a real source lemma.
- Pending pickup is deterministic and identity-based.
- Consumed pending relations are deleted through `deletePendingRelation`.
- Empty pending refs are deleted through explicit `deletePendingRef`.

### Revisions And Stale Lookup

- `findStoredLemmaSenses` may return a revision for diagnostics or display, but
  `addAttestation` does not pin that lookup revision.
- Mutations reload their own operation context.
- Commit safety comes from mutation-time semantic preconditions and storage
  conflict reporting.

## Implementation Order

1. Move shared v1 DTO types into `dto/`, `public/`, and `storage/`.
2. Define concrete `PlannedChangeOp` and `ChangePrecondition` unions.
3. Implement language guard and typed language mismatch error.
4. Implement relation inverse rules and relation patch helpers.
5. Implement pending identity, pending relation keys, and pickup planner.
6. Implement `planAddAttestation`.
7. Implement `planAddNewNote`.
8. Implement strict `applyPlan` for in-memory/reference behavior.
9. Implement in-memory storage adapter and boot helper.
10. Add service tests from `TESTING_STRATEGY.md`.
