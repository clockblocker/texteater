# dumdict Relations Cleanup Spec

## Goal

Define an explicit API for cleaning up pending relations.

Relation cleanup is a back-office workflow:

1. `dumdict` loads a cleanup workset for one `canonicalLemma`
2. back-office performs sense disambiguation outside `dumdict`
3. back-office sends explicit cleanup decisions back to `dumdict`
4. `dumdict` applies the cleanup atomically

This keeps relation state in only two forms:

- `full-sense <-> PendingLemmaRef`
- `full-sense <-> full-sense`

There is no implicit in-between state and no automatic mechanical matching
inside `dumdict`.

## Non-Goal

These APIs do not decide which full sense a pending relation should resolve to.

That decision belongs to the back-office, with LLM support and/or human review
if the host chooses to use it.

## Public API

```ts
type DumdictService<L extends SupportedLanguage> = {
  findStoredLemmaSenses(
    request: FindStoredLemmaSensesRequest<L>,
  ): Promise<FindStoredLemmaSensesResult<L>>;

  addAttestation(
    request: AddAttestationRequest<L>,
  ): Promise<MutationResult<L>>;

  addNewNote(
    request: AddNewNoteRequest<L>,
  ): Promise<MutationResult<L>>;

  getInfoForRelationsCleanup(
    request: GetInfoForRelationsCleanupRequest<L>,
  ): Promise<GetInfoForRelationsCleanupResult<L>>;

  cleanupRelations(
    request: CleanupRelationsRequest<L>,
  ): Promise<MutationResult<L>>;
};
```

## Method 1: `getInfoForRelationsCleanup`

### Purpose

Load the `dumdict`-owned cleanup workset for one `canonicalLemma`.

This method does not promise to return all context a host might want for LLM
prompting or human review. It returns the cleanup data that `dumdict` owns, and
the back-office may join that workset with host-specific context if needed.

### Request

```ts
type GetInfoForRelationsCleanupRequest<L extends SupportedLanguage> = {
  canonicalLemma: string;
};
```

### Result

`getInfoForRelationsCleanup` returns a read-only workset.

```ts
type GetInfoForRelationsCleanupResult<L extends SupportedLanguage> = {
  revision: StoreRevision;
  canonicalLemma: string;
  candidateLemmaIds: DumlingId<"Lemma", L>[];
  pendingRelations: CleanupPendingRelation<L>[];
  diagnostics?: DumdictDiagnostic[];
};
```

```ts
type CleanupPendingRelation<L extends SupportedLanguage> = {
  sourceLemmaId: DumlingId<"Lemma", L>;
  pendingRef: PendingLemmaRef<L>;
  relation: LexicalRelation | MorphologicalRelation;
};
```

### Contract

- returns a single coherent snapshot at `revision`
- uses the same canonical-lemma semantics already used by
  `derivePendingLemmaId`
- does not define a separate cleanup-specific normalization rule
- returns all stored full-sense IDs whose `canonicalLemma` matches the request
- returns all pending relations whose target pending ref has matching
  `canonicalLemma`, across the full dictionary
- rejects malformed input before loading storage
- performs no mutation
- performs no ranking
- performs no automatic sense matching
- does not promise deterministic ordering of `candidateLemmaIds` or
  `pendingRelations`

### Shape And Identity

- `candidateLemmaIds` may be empty
- `pendingRelations` may be empty
- both may be non-empty at the same time
- the cleanup API identifies one pending relation by `sourceLemmaId`,
  `relation`, and `pendingRef.pendingId`
- `relationFamily` remains part of internal DTOs, but is omitted from this API
  because it can be inferred from `relation`
- this API relies on `relation` names being globally unique across relation
  families

## Method 2: `cleanupRelations`

### Purpose

Apply explicit cleanup decisions produced by the back-office after
disambiguation.

### Request

```ts
type CleanupRelationsRequest<L extends SupportedLanguage> = {
  baseRevision: StoreRevision;
  resolutions: CleanupRelationResolution<L>[];
};
```

```ts
type CleanupRelationResolution<L extends SupportedLanguage> = {
  sourceLemmaId: DumlingId<"Lemma", L>;
  relation: LexicalRelation | MorphologicalRelation;
  targetPendingId: PendingLemmaId<L>;
  targetLemmaId?: DumlingId<"Lemma", L>;
};
```

### Semantics

- if a pending relation is absent from `resolutions`, it remains pending
- if a pending relation appears in `resolutions` with `targetLemmaId`, it is
  consumed and converted into a real `full-sense <-> full-sense` relation
- if a pending relation appears in `resolutions` without `targetLemmaId`, it is
  consumed and deleted
- if `resolutions` is empty, the method returns an applied no-op result without
  calling storage commit
- cleanup is atomic for the whole request
- the method returns a normal `MutationResult<L>`

### Result

```ts
type CleanupRelationsResult<L extends SupportedLanguage> = MutationResult<L>;
```

### Contract

- all requested resolutions are applied against `baseRevision`
- rejects malformed input before planning or commit
- rejects duplicate `resolutions` entries for the same natural key
- if `baseRevision` is stale, the result is `conflict`
- if a referenced pending relation tuple no longer exists, the result is
  `conflict`
- if a `targetLemmaId` does not exist at planning or commit time, the result is
  `conflict`
- if a `targetLemmaId` is provided, its lemma identity must match the resolved
  pending ref identity tuple, not only the shared `canonicalLemma`
- pending refs with no remaining incoming relations may be deleted as part of
  cleanup

## Cleanup Behavior

If a resolution includes `targetLemmaId`:

- reject the resolution as `selfRelation` if `targetLemmaId === sourceLemmaId`
- reject the resolution if `targetLemmaId` does not match the pending ref's
  identity tuple
- add the forward relation from `sourceLemmaId` to `targetLemmaId`
- add the inverse relation from `targetLemmaId` to `sourceLemmaId`
- if either real relation already exists, treat that edge as already satisfied
  rather than conflicting
- delete the pending relation
- if its `PendingLemmaRef` has no more incoming relations, delete that pending
  ref

If a resolution omits `targetLemmaId`:

- delete the pending relation
- do not create any full-sense relation
- if its `PendingLemmaRef` has no more incoming relations, delete that pending
  ref

## Back-Office Workflow

1. call `getInfoForRelationsCleanup({ canonicalLemma })`
2. inspect `candidateLemmaIds` and `pendingRelations`
3. run LLM or human sense disambiguation outside `dumdict`
4. build `resolutions` for the subset to consume
5. call `cleanupRelations({ baseRevision, resolutions })`

## Example: Unambiguous Resolution

Stored:

- lemma `walk`
- pending relation `walk --nearSynonym--> pending(swim)`
- stored full sense `swim`

Read call:

```ts
await dict.getInfoForRelationsCleanup({ canonicalLemma: "swim" });
```

Possible response shape:

```ts
{
  revision: "r42",
  canonicalLemma: "swim",
  candidateLemmaIds: ["lemma:en:..."],
  pendingRelations: [
    {
      sourceLemmaId: "lemma:en:walk",
      pendingRef: { pendingId: "pending:v1:...", canonicalLemma: "swim", ... },
      relation: "nearSynonym"
    }
  ]
}
```

Write call:

```ts
await dict.cleanupRelations({
  baseRevision: "r42",
  resolutions: [
    {
      sourceLemmaId: "lemma:en:walk",
      relation: "nearSynonym",
      targetPendingId: "pending:v1:...",
      targetLemmaId: "lemma:en:swim"
    }
  ]
});
```

Result:

- `walk.nearSynonym` contains `swim`
- `swim.nearSynonym` contains `walk`
- pending relation deleted
- pending ref deleted if unused

## Example: Ambiguous Resolution

Stored:

- pending relation to `pending(bank)`
- stored full sense `bank` as financial institution
- stored full sense `bank` as river edge

Read call returns:

- both candidate lemma IDs
- one or more pending relations targeting `bank`

Back-office decides one relation maps to financial sense and another stays
unresolved.

Write call:

```ts
await dict.cleanupRelations({
  baseRevision: "r77",
  resolutions: [
    {
      sourceLemmaId: "lemma:en:savings-bank",
      relation: "hypernym",
      targetPendingId: "pending:v1:bank",
      targetLemmaId: "lemma:en:bank-financial"
    }
  ]
});
```

Result:

- the requested pending relation is consumed
- all other `bank` pending relations stay pending

## Example: Explicit Drop

Back-office decides a pending relation should be removed, not resolved.

```ts
await dict.cleanupRelations({
  baseRevision: "r81",
  resolutions: [
    {
      sourceLemmaId: "lemma:en:walk",
      relation: "nearSynonym",
      targetPendingId: "pending:v1:swim"
    }
  ]
});
```

Result:

- the requested pending relation is deleted
- no real relation created

## Edge Cases For TDD

### `getInfoForRelationsCleanup`

- returns empty `candidateLemmaIds` and empty `pendingRelations` when nothing
  matches
- rejects malformed input
- returns candidate lemma IDs when full senses exist but no pending relations
  exist
- returns pending relations when no full-sense candidates exist
- returns multiple candidate lemma IDs for same `canonicalLemma`
- returns multiple pending relations from different source lemmas into the same
  pending ref
- returns multiple pending refs with the same `canonicalLemma` separately when
  they have different `targetPendingId` values
- treats multiple physical pending refs with the same `targetPendingId` as
  malformed storage state rather than distinct cleanup items
- does not mutate state

### `cleanupRelations`

- rejects malformed input
- returns an applied no-op result when `resolutions` is empty
- rejects duplicate `resolutions` entries for the same pending relation key
- resolves one pending relation into one existing full sense
- resolves multiple pending relations in one atomic request
- partially resolves a workset while leaving omitted relations pending
- drops a pending relation when resolution has no `targetLemmaId`
- deletes a pending ref when its last incoming relation is consumed
- keeps a pending ref when some incoming relations remain
- adds inverse-paired full-sense relations correctly
- rejects self-resolution as `selfRelation`
- rejects a resolution whose `targetLemmaId` does not match the pending ref
  identity tuple
- consumes a pending relation even when the corresponding real relation already
  exists
- conflicts when `targetLemmaId` does not exist
- conflicts on stale `baseRevision`
- conflicts when a requested pending relation tuple no longer exists
- does not promise deterministic ordering of changes reflected in storage-facing
  side effects, only atomic semantic outcome
- does not touch unresolved relations omitted from `resolutions`

## API Identity Rule

The cleanup API identifies one pending relation by:

- `sourceLemmaId`
- `relation`
- `targetPendingId`

This is an API-level natural key. `relationFamily` remains part of internal
DTOs and storage semantics, but is omitted from the cleanup API because it can
be inferred from `relation`.

Duplicate pending relations with the same tuple are invalid semantic state.
They should be deduped at creation time or rejected as malformed storage state.

Duplicate `resolutions` entries with the same tuple are malformed request state
and should be rejected before planning.

## Integration Intent

- pending cleanup happens only when the back-office chooses to call
  `getInfoForRelationsCleanup` and `cleanupRelations`
- the back-office is the only place where pending-to-full-sense decisions are
  made
- this spec does not define any `addNewNote` behavior changes
- cleanup no-op results use:
  - `status: "applied"`
  - `baseRevision === nextRevision`
  - empty `affected`
  - summary message `"No relations cleaned up."`
