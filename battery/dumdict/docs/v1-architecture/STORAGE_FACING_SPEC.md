# dumdict V1 Storage-Facing Spec

The storage-facing API is the setup-time adapter contract a host implements so
the configured `dumdict` service can execute its UI-facing operations.

The storage port may be detailed because it is implemented once by the host
adapter, not touched by ordinary UI code.

## Setup API

At setup time, a host passes language/config plus storage functions.

```ts
type CreateDumdictServiceOptions<L> = {
  language: L;
  storage: DumdictStoragePort<L>;
  config?: DumdictServiceConfig<L>;
};

declare function createDumdictService<L>(
  options: CreateDumdictServiceOptions<L>,
): DumdictService<L>;
```

## Storage Port

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

These four methods are the required v1 storage-facing API. They map to the three
UI-facing operations while keeping storage-specific query and write details
behind setup.

## Find Stored Lemma Senses

Used by `DumdictService.findStoredLemmaSenses(...)`.

```ts
type FindStoredLemmaSensesStorageRequest<L> = {
  lemmaDescription: LemmaDescription<L>;
};

type StoredLemmaSensesSlice<L> = {
  revision: StoreRevision;
  candidates: Array<{
    entry: LemmaEntry<L>;
    relationNotes?: RelationNotesForDisambiguation<L>;
  }>;
};
```

Storage obligation:

```txt
Return every stored lemma whose language, canonicalLemma, lemmaKind, and
lemmaSubKind match the requested lemma description.
```

This is not an exact lemma identity lookup. The UI does not know the full lemma
identity yet, so the storage port returns every stored sense that shares the
coarse resolved lemma description.

## Load Lemma For Patch

Used by `DumdictService.addAttestation(...)`.

```ts
type LoadLemmaForPatchRequest<L> = {
  lemmaId: DumlingId<"Lemma", L>;
};

type LemmaPatchSlice<L> = {
  revision: StoreRevision;
  lemma?: LemmaEntry<L>;
};
```

Storage obligation:

```txt
Return the lemma entry for the requested lemma ID, or absence if it does not
exist.
```

The configured service uses this slice to plan a semantic lemma patch, then
commits it through `commitChanges(...)`.

## Load New Note Context

Used by `DumdictService.addNewNote(...)`.

```ts
type LoadNewNoteContextRequest<L> = {
  draft: DumdictEntryDraft<L>;
};

type NewNoteSlice<L> = {
  revision: StoreRevision;

  existingLemma?: LemmaEntry<L>;
  existingOwnedSurfaces: SurfaceEntry<L>[];

  explicitExistingRelationTargets: LemmaEntry<L>[];
  existingPendingRefsForProposedPendingTargets: PendingLemmaRef<L>[];

  matchingPendingRefsForNewLemma: PendingLemmaRef<L>[];
  incomingPendingRelationsForNewLemma: PendingLemmaRelation<L>[];
  incomingPendingSourceLemmas: LemmaEntry<L>[];
};
```

Storage obligations:

- if a lemma with the new lemma ID already exists, return it as
  `existingLemma`
- return existing surfaces among the draft's proposed owned surfaces
- return every existing lemma explicitly referenced by ID in draft relations
- for every proposed pending relation target, return any already-existing
  matching pending ref
- return every pending ref matching the new lemma identity tuple
- return every pending relation pointing into those matching pending refs
- return every source lemma for those incoming pending relations

The configured service uses this slice to create the new note, add explicit
relations, create pending refs for missing relation targets, and pick up old
pending refs that match the inserted lemma.

If `existingOwnedSurfaces` is non-empty for `addNewNote`, the service rejects
with `ownedSurfaceAlreadyExists`. V1 `addNewNote` creates missing owned surfaces;
it does not merge or patch existing surface entries.

## Commit Changes

Used by `addAttestation(...)` and `addNewNote(...)` after semantic planning.

```ts
type CommitChangesRequest<L> = {
  baseRevision: StoreRevision;
  changes: PlannedChangeOp<L>[];
};

type CommitChangesResult =
  | { status: "committed"; nextRevision: StoreRevision }
  | {
      status: "conflict";
      code: CommitConflictCode;
      latestRevision?: StoreRevision;
      message?: string;
    };

type CommitConflictCode =
  | "revisionConflict"
  | "semanticPreconditionFailed";
```

Storage obligation:

```txt
Apply planned semantic changes atomically, honoring the semantic preconditions
attached to those changes. Translate the commands into the host's persistence
model.
```

Obsidian may translate changes into markdown edits. SQLite may translate them
into a transaction. Electron may forward them to a server or apply them to a
local database/cache.

## Core Planning Result

The semantic core produces plans internally.

A mutation plan answers: "Given this structured intent and loaded slice, what
semantic changes should the host write?"

```ts
type PlanMutationResult<L> = {
  baseRevision: StoreRevision;
  intent: DictionaryIntent<L>;
  changes: PlannedChangeOp<L>[];
  affected: AffectedDictionaryEntities<L>;
  summary: MutationPlanSummary;
  diagnostics?: DumdictDiagnostic[];
};
```

Each `PlannedChangeOp` carries its own semantic preconditions:

```ts
type PlannedChangeOp<L> = {
  type: string;
  preconditions: ChangePrecondition<L>[];
  // op-specific payload
};
```

The minimum v1 planned-change vocabulary is:

```ts
type PlannedChangeOpType =
  | "createLemma"
  | "patchLemma"
  | "createOwnedSurface"
  | "createPendingRef"
  | "deletePendingRef"
  | "createPendingRelation"
  | "deletePendingRelation";
```

For v1, preconditions are op-local. A future plan-level precondition list can be
introduced if repeated preconditions, such as revision checks, become too noisy.

The configured service consumes this plan and passes its semantic changes to
the storage port. `dumdict-core` itself does not commit.

## Pending References

Unresolved references are not stored as fake lemma entries.

They are stored as:

```ts
type PendingLemmaRef<L> = {
  pendingId: PendingLemmaId<L>;
  language: L;
  canonicalLemma: string;
  lemmaKind: LemmaKindFor<L>;
  lemmaSubKind: LemmaSubKindFor<L, any>;
};

type PendingLemmaRelation<L> = {
  sourceLemmaId: DumlingId<"Lemma", L>;
  relationFamily: "lexical" | "morphological";
  relation: LexicalRelation | MorphologicalRelation;
  targetPendingId: PendingLemmaId<L>;
};
```

`PendingLemmaId` must be deterministic. It is derived by `dumling` from the
pending lemma identity tuple:

```ts
type PendingLemmaIdentity<L> = {
  language: L;
  canonicalLemma: string;
  lemmaKind: LemmaKindFor<L>;
  lemmaSubKind: LemmaSubKindFor<L, any>;
};
```

Pending ID derivation and pending pickup must use the same `dumling` lemma
identity rules. If two pending targets produce the same `dumling` pending ID,
they represent the same unresolved lemma target. When an inserted lemma has the
same `dumling` identity as a pending target, pickup materializes the pending
relations for that target.

Invariants:

- unresolved relation targets are not embedded inside `LemmaEntry` relation maps
- unresolved targets are not represented as `LemmaEntry` stubs
- every unresolved target is represented by `PendingLemmaRef`
- every link to an unresolved target is represented by `PendingLemmaRelation`
  from a real source lemma
- pending refs with no incoming pending relations are invalid and should be
  removed by an explicit `deletePendingRef` planned change

Example:

If the host inserts a real lemma for `коса 𓌳` and the proposed relations include
missing `грабли`, `dumdict` should not create a fake `грабли` lemma.

It should plan:

```txt
createPendingRef(грабли identity tuple)
createPendingRelation(source = коса𓌳, target = pending-грабли)
```

## Pending Pickup

When a real lemma is inserted, `dumdict` must check whether existing pending
refs match that lemma's identity tuple:

```ts
{
  language,
  canonicalLemma,
  lemmaKind,
  lemmaSubKind,
}
```

For every matching pending ref, each incoming pending relation is materialized
into resolved inverse-paired lemma relations.

Given:

```txt
sourceLemma --relation--> pendingTarget
```

And a newly inserted real lemma that matches `pendingTarget`, the plan should
include:

```txt
patchLemma(sourceLemma, add relation -> newLemma)
patchLemma(newLemma, add inverse relation -> sourceLemma)
deletePendingRelation(sourceLemma -> pendingTarget)
```

If that was the last pending relation pointing at the pending ref, the pending
ref is removed by an explicit `deletePendingRef` planned change. Storage does
not invent this cleanup. It applies `deletePendingRelation` and
`deletePendingRef` exactly as planned, atomically with their preconditions.

```txt
deletePendingRelation(sourceLemma -> pendingTarget)
deletePendingRef(pendingTarget)
```

Pickup is deterministic. It is based on the `dumling` lemma identity, not LLM
judgment and not spelling-only matching.

## Relation Inverse Rules

All resolved lemma-lemma relations are stored as inverse pairs. This does not
mean every relation is symmetric: `hypernym` and `hyponym` are different
directed relations that form an inverse pair.

Inverse rules are scoped by relation family:

```ts
type RelationInverseRule =
  | {
      family: "lexical";
      relation: LexicalRelation;
      inverse: LexicalRelation;
    }
  | {
      family: "morphological";
      relation: MorphologicalRelation;
      inverse: MorphologicalRelation;
    };
```

`dumdict` owns these inverse rules. Storage applies the semantic changes it is
given; it does not invent relation inverses.

Initial v1 inverse rules:

```ts
const lexicalRelationInverses = {
  synonym: "synonym",
  nearSynonym: "nearSynonym",
  antonym: "antonym",
  hypernym: "hyponym",
  hyponym: "hypernym",
  meronym: "holonym",
  holonym: "meronym",
} satisfies Record<LexicalRelation, LexicalRelation>;

const morphologicalRelationInverses = {
  consistsOf: "usedIn",
  usedIn: "consistsOf",
  derivedFrom: "sourceFor",
  sourceFor: "derivedFrom",
} satisfies Record<MorphologicalRelation, MorphologicalRelation>;
```

## Semantic Preconditions

Plans should carry semantic preconditions so hosts can detect conflicts without
depending only on a coarse revision check.

These preconditions live on each `PlannedChangeOp`.

This is the authoritative v1 precondition union:

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

The host translates these checks into its own persistence model.
