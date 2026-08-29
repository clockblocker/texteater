# High-ROI Architecture Refactors

Status: implementation specification

## Outcome

Implement the smallest set of refactors that materially improves semantic
locality, runtime safety, or storage efficiency:

1. share Dumgen projection semantics without coupling authoring dependencies to
   operational runtime;
2. give Pending Semantic Relation identity one authoritative Dumdict module;
3. replace Dumdict's overloaded Reading Entry load request with one
   intent-shaped, snapshot-consistent seam;
4. repair the existing `ensureReadingEntry` validation escape before the
   refactors begin.

These changes must preserve the accepted domain model, public lightweight
parser interfaces, direct-only Semantic Relation storage, and host-owned
persistence.

## Priority and expected return

| Priority | Work | Return |
| --- | --- | --- |
| P0 | Validate the `ensureReadingEntry` storage slice | Closes an existing correctness hole with minimal risk. |
| P1 | Share Dumgen semantic projections | Removes duplicated policy across authoring and operational runtime. |
| P1 | Deepen Pending Semantic Relation identity | Concentrates identity invariants currently repeated across workflows and adapters. |
| P2 | Deepen the Reading Entry load seam | Removes fabricated drafts and avoids irrelevant relation-inventory reads. |

## P0: close the Reading Entry validation escape

`ensureReadingEntry` currently loads a `NewNoteSlice` and plans changes without
calling the configured slice validator.

Required change:

- validate the loaded slice against the Reading Entry's Reading before calling
  `planEnsureReadingEntry`;
- add a focused test that supplies a malformed or mismatched slice and proves
  that planning and commit are not reached.

This repair must land independently so the later load-seam refactor does not
hide an existing defect inside a larger change.

## P1: share Dumgen semantic projections

### Problem

Target Classification and German Grammatical Resolution each have semantic
projection rules duplicated between their authoring path and the generated
operational runtime path. Policy changes therefore require coordinated edits
and large parity tests.

### Required module shape

Create two Zod-free in-process modules, not one general-purpose projection
module:

1. **German High-Level Target Classification Projection** owns compact Segment
   indexing, marked-sentence construction, click membership, ordered member
   restoration, and canonical `AnalysisTarget` construction.
2. **German Grammatical Resolution Projection** owns route-fixed fields,
   normalized Surface construction, Phraseme realization coverage, the NOUN
   Ergänzungsstrich rule, and other route-specific canonicalization policy.

Each module must expose only the operations needed by both callers. Purely
authoring-only work, such as turning canonical Golden Cases into private
demonstration representations, remains inside the Prompt Representation
Adapter unless it is also duplicated.

### Seam and dependency constraints

- Prompt Representation Adapters and operational runtime mapping are adapters
  over the shared projection modules.
- The shared implementation may import lightweight domain types and pure
  helpers only.
- It must not value-import Zod, codec-builder, canonical schema trees, Prompt
  Assembly, generated prompt data, or authoring catalogs.
- Authoring adapters retain schema parsing and codec-based linking.
- Operational adapters retain generated lightweight validation and dispatch-ID
  binding.
- Do not move runtime mapping into Prompt Assembly.
- Do not combine Target Classification and Grammatical Resolution behind one
  broad interface merely because both are called projections.

### Migration

1. Characterize the current shared semantics at the proposed module
   interfaces.
2. Move Target Classification projection policy into its module and bind both
   adapters to it.
3. Move Grammatical Resolution projection policy into its module and bind both
   adapters to it.
4. Delete the duplicated runtime implementations.
5. Replace broad implementation-parity tests with interface tests for each
   module plus a small binding test for each adapter.

### Acceptance criteria

- Every semantic rule named above has one implementation.
- Target membership and route-specific Surface policy change in one locality.
- Operational Dumgen entrypoints remain Zod-free and within existing RSS
  budgets.
- Generated runtime prompt artifacts remain deterministic and fresh.
- Tests exercise the shared module interfaces; they do not compare two
  independent implementations of the same policy.
- The public Dumgen interface and frozen lightweight parser interfaces do not
  change.

## P1: deepen Pending Semantic Relation identity

### Problem

Dumdict currently repeats Pending Semantic Relation record construction,
locator encoding, locator equality, and deduplication. Validation checks that a
locator matches the source Reading and relation, but does not prove that
`targetPendingId` is derived from the record's normalized Unit Shadow.

### Required module shape

Deepen `core/pending` into the in-process owner of semantic pending identity.
Its small interface must cover:

- canonical record construction from a normalized Pending Semantic Relation and
  source Reading;
- `PendingEntryId` derivation from the complete Unit Shadow identity;
- complete locator derivation;
- exact semantic locator comparison and stable semantic keys;
- record deduplication by exact locator;
- assertion that a stored record's source key, relation, and target pending ID
  all match its contents.

Resolution policy remains in relation maintenance. Physical database index
encoding remains adapter-local. Adapters may reuse the semantic key if it fits
their storage representation, but the core module must not know about Convex
indexes or in-memory storage layout.

### Migration

1. Add interface tests covering canonical construction, normalization-sensitive
   identity, repeated proposals, and each locator mismatch.
2. Replace record construction and semantic `locatorKey` copies in workflows
   and core planning.
3. Route slice validation through the new identity assertion.
4. Replace semantic equality and deduplication copies in the in-memory adapter.
5. Keep Convex's physical index construction local, while verifying it is
   derived from the canonical semantic locator.
6. Delete superseded helpers and tests that inspect their implementation.

### Acceptance criteria

- A forged or stale `targetPendingId` is rejected before planning.
- Equal normalized proposals produce one exact record.
- Different source Readings, relations, or Unit Shadow identities never
  collide.
- Workflow callers do not assemble locators themselves.
- Pending resolution behavior, direct-only storage, and atomic create/delete
  behavior remain unchanged.

## P2: deepen the Reading Entry load seam

### Problem

Four workflows call `loadNewNoteContext` even though only `addNewNote` owns a
real `DumdictReadingDraft`. Other workflows fabricate drafts to cross the seam,
and adapters load the complete relation inventory even for operations that do
not perform relation maintenance.

### Required module shape

Replace the draft-shaped load request with one discriminated, intent-shaped
Reading Entry context request. It must represent at least these intents:

- add a new note;
- apply generated Knowledge;
- ensure an owned Surface;
- ensure a Reading Entry.

The response must also be discriminated by intent so callers cannot depend on
facts their workflow did not request. One deep load module shapes the request,
invokes the storage seam once, validates the returned slice, and returns the
validated workflow context.

Relation-aware intents may request the complete relation inventory and exact
pending records. Identity-only or Surface-only intents must not receive that
inventory.

### Snapshot constraint

Each workflow load is exactly one adapter call and one storage snapshot.
Conditional acquisition happens inside the adapter's implementation of that
single request. The deep module must not assemble a context from sequential
remote reads because separate Convex queries can observe different revisions.

Every returned context carries one base `StoreRevision`, and every fact in the
context must belong to that revision.

### Migration

1. Define the intent/request and intent/result unions with the minimum facts
   needed by existing planners.
2. Implement the new request in the in-memory adapter with read instrumentation
   for relation-inventory access.
3. Implement each intent as a single Convex query or one query handler with
   intent-specific branches.
4. Introduce the validating load module and migrate one workflow at a time.
5. Remove fabricated drafts and the old `loadNewNoteContext` interface once all
   callers migrate.
6. Replace old slice tests with tests at the validating load interface, while
   retaining adapter-specific query and limit tests.

### Acceptance criteria

- No workflow fabricates a `DumdictReadingDraft` to load storage facts.
- Every loaded context is validated before semantic planning.
- `ensureOwnedSurface` and `ensureReadingEntry` do not load relation Lemmas,
  relation Readings, or unrelated pending records.
- `addNewNote` and `applyGeneratedKnowledge` retain all relation and pending
  behavior they require.
- A workflow uses one revision and one adapter load call.
- The atomic commit seam and public `DumdictPlan` remain unchanged.

## Delivery order

1. Land the P0 validation repair.
2. Implement the two Dumgen projection modules independently.
3. Implement Pending Semantic Relation identity.
4. Implement the Reading Entry load seam using the new pending identity module.
5. Run package and repository verification after each independently reviewable
   change; do not combine all work into one migration.

## Verification gates

For Dumgen changes:

- `bun run --cwd battery/dumgen check`
- `bun run --cwd battery/dumgen test:internal`
- `bun run --cwd battery/dumgen generate:runtime-prompts:check`
- `bun run verify:dum-runtime`

For Dumdict changes:

- `bun run --cwd battery/dumdict check`
- `bun run --cwd battery/dumdict test:internal`
- focused tf-demo Convex storage and relation tests
- repository validation before the final migration lands

## Explicitly deferred

Do not include the following in this implementation sequence:

- a single combined semantic projection module;
- an authoring/runtime route inventory that imports Zod-authored bindings into
  operational code;
- a deeper generic Resolution Branch dispatcher;
- a canonical direct relation inventory justified by allegedly dropped
  endpoints;
- moving complete relation patch planning into one module before a small
  interface is demonstrated;
- a universal storage-conformance suite until the storage interface resolves
  tf-demo's intentionally host-owned Attestation operations;
- Evaluation Run interface cleanup, which currently has little caller impact.

These may be reconsidered only after the prioritized refactors land and new
evidence shows that their interfaces would earn additional leverage.
