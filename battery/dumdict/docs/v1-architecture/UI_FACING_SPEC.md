# dumdict V1 UI-Facing Spec

The UI-facing service API is the small task-oriented API called by application
workflows. It must not expose storage slices, snapshots, pending pickup details,
or planned change operations to ordinary UI callers.

## Service API

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

Example runtime calls:

```ts
await dict.findStoredLemmaSenses({ lemmaDescription });
await dict.addAttestation({ lemmaId, attestation });
await dict.addNewNote({ draft });
```

The configured service is the runtime authority for language. Even when request
DTOs carry their own language fields, the service must validate that every
request language, DTO language, and `dumling` ID language matches the configured
service language before calling storage. A mismatch is a caller/programmer error
and should throw a typed language mismatch error rather than reaching the storage
port.

## Find Stored Lemma Senses

The UI performs lemma resolution before calling `dumdict`.

After the end user selects a word, the UI may ask its LLM to resolve the
selected form into a lemma description. At this point the UI knows the language,
canonical lemma, lemma kind, and lemma subkind. It does not yet know inherent
features, emoji/discriminator identity, or which stored sense matches the
attestation.

`dumdict` receives only the resolved lemma description and returns stored
candidate senses for that lemma description.

```ts
type FindStoredLemmaSensesRequest<L> = {
  lemmaDescription: {
    language: L;
    canonicalLemma: string;
    lemmaKind: LemmaKindFor<L>;
    lemmaSubKind: LemmaSubKindFor<L, any>;
  };
};
```

The result should contain enough note data for the UI to ask its LLM which
candidate, if any, matches the attested lemma.

Returning only IDs is allowed as a strict minimum, but the preferred result is a
small disambiguation note per candidate.

```ts
type FindStoredLemmaSensesResult<L> = {
  revision: StoreRevision;
  candidates: LemmaSenseCandidate<L>[];
  diagnostics?: DumdictDiagnostic[];
};

type LemmaSenseCandidate<L> = {
  lemmaId: DumlingId<"Lemma", L>;
  note: LemmaNoteForDisambiguation<L>;
};

type LemmaNoteForDisambiguation<L> = {
  lemma: Lemma<L>;
  attestedTranslations: string[];
  attestations: string[];
  notes: string;
  relations?: RelationNotesForDisambiguation<L>;
};
```

The UI then asks its LLM whether one of these candidates matches the
attestation. If yes, it calls `addAttestation`. If no, it performs additional
LLM calls to construct a new note draft and then calls `addNewNote`.

`dumdict` does not accept sentence context for this lookup. It cannot interpret
context because it is not connected to the LLM.

## Add Attestation

The UI calls this when its LLM decided that the new attestation belongs to an
existing stored sense.

```ts
type AddAttestationRequest<L> = {
  lemmaId: DumlingId<"Lemma", L>;
  attestation: string;
};
```

The service hides loading patch context, planning semantic changes, and asking
the storage port to commit.

The selected candidate may come from an earlier, stale lookup result.
`addAttestation` therefore reloads the lemma patch slice before planning. In v1,
the planned mutation only needs semantic preconditions such as `lemmaExists` and
`lemmaAttestationMissing`; it does not need to pin the earlier lookup revision or
candidate set. If the lemma is missing in the loaded slice, the service rejects
with `lemmaMissing`. If it disappears or changes before commit, storage reports a
conflict.

## Add New Note

The UI calls this when no stored sense matches and it has collected a full new
note draft through its own LLM flow.

```ts
type AddNewNoteRequest<L> = {
  draft: DumdictEntryDraft<L>;
};
```

The UI/LLM should not mint a new ID. It should provide a full `Lemma<L>` DTO,
and `dumdict`/`dumling` derive the stable lemma ID from that DTO.

`addNewNote` hides:

- detecting whether the lemma already exists
- creating the lemma if missing
- creating owned surfaces
- adding explicit existing relations
- creating pending refs for missing relation targets
- picking up old pending refs that match the inserted lemma
- committing all semantic changes through the storage port

If the loaded storage slice already contains a lemma with the ID derived from
the draft lemma, `addNewNote` should reject the request with
`lemmaAlreadyExists`. It should not silently merge the draft into the existing
lemma.

If the loaded slice says the lemma is missing, but commit fails because another
writer inserted the same lemma first, the result should be `conflict`, not
`rejected`.

`addNewNote` should also reject existing owned-surface collisions. If the loaded
storage slice already contains a surface with the ID derived from any proposed
owned surface in the draft, return `ownedSurfaceAlreadyExists`. Do not silently
merge or patch existing surface note data during `addNewNote`. Updating an
existing owned surface is a separate future operation. If the loaded slice says
the surface is missing, but commit fails because another writer inserted it
first, the result should be `conflict`, not `rejected`.

## Entry Draft Shape

LLMs and consumer applications should collect generated dictionary data into
typed DTOs before calling `dumdict`.

```ts
type DumdictEntryDraft<L> = {
  lemma: Lemma<L>;
  note: {
    attestedTranslations: string[];
    attestations: string[];
    notes: string;
  };
  ownedSurfaces?: OwnedSurfaceDraft<L>[];
  relations?: ProposedRelation<L>[];
};
```

Relation targets may be existing or pending:

```ts
type ProposedRelationTarget<L> =
  | { kind: "existing"; lemmaId: DumlingId<"Lemma", L> }
  | {
      kind: "pending";
      ref: {
        canonicalLemma: string;
        lemmaKind: LemmaKindFor<L>;
        lemmaSubKind: LemmaSubKindFor<L, any>;
      };
    };
```

This keeps LLM output persistence-agnostic while giving `dumdict` enough
structure to validate, normalize, and plan changes.

## Mutation Result

Runtime mutation methods such as `addAttestation` and `addNewNote` should return
a typed mutation result.

```ts
type MutationResult<L> =
  | {
      status: "applied";
      baseRevision: StoreRevision;
      nextRevision: StoreRevision;
      affected: AffectedDictionaryEntities<L>;
      summary: MutationSummary;
      diagnostics?: DumdictDiagnostic[];
    }
  | {
      status: "conflict";
      code: MutationConflictCode;
      baseRevision: StoreRevision;
      latestRevision?: StoreRevision;
      message?: string;
      diagnostics?: DumdictDiagnostic[];
    }
  | {
      status: "rejected";
      code: MutationRejectedCode;
      message?: string;
      diagnostics?: DumdictDiagnostic[];
    };

type MutationConflictCode =
  | "revisionConflict"
  | "semanticPreconditionFailed";

type MutationRejectedCode =
  | "lemmaAlreadyExists"
  | "ownedSurfaceAlreadyExists"
  | "lemmaMissing"
  | "invalidDraft"
  | "selfRelation"
  | "relationTargetMissing";
```

Expected semantic failures and storage conflicts should be returned through this
result shape. Unexpected programmer/configuration errors may still throw typed
errors. The UI caller should not have to manually apply `PlannedChangeOp`s
during ordinary operation.
