# `dumdict`

Semantic glue for dictionary-note applications built on top of `dumling`.

`dumdict` sits between host-owned dictionary storage and user-facing application
workflows. It does not own persistence, sync, conflict UX, or LLM calls. A host
supplies storage functions at setup time; UI code calls a small
task-oriented service at runtime.

The intended v1 hosts are:

- an Obsidian plugin that serializes entries into markdown files
- a Node server backed by SQLite for research-oriented dictionary data
- an Electron app backed by remote LLM/database services plus a local cache

## Core idea

A `dumdict` service is bound to one language and one storage adapter:

```ts
const dict = createDumdictService({ language: "en", storage });
```

The runtime service has seven UI-facing operations:

- `findStoredReadings`: return learner Readings for an exact structural Lemma
- `addAttestation`: append evidence to an existing Reading
- `addNewNote`: store a Lemma and a new learner Reading
- `applyGeneratedKnowledge`: atomically plan generated Knowledge Changes and pending relations for an existing Reading
- `ensureOwnedSurface`: attach a newly encountered Surface to an existing Reading's Lemma
- `getInfoForRelationsCleanup`: inspect unresolved relation targets
- `cleanupRelations`: retry unresolved targets through deterministic Lemma resolution

The surrounding application owns the workflow around those calls. In the normal
flow, the user clicks a text segment, the UI resolves its Surface and Lemma
through its own LLM flow, `dumdict` returns candidate stored Readings, and the UI asks its LLM whether
one candidate matches. If one does, the UI calls `addAttestation`; otherwise it
collects a full note draft and calls `addNewNote`.

`dumdict` owns the dictionary workflow semantics behind those calls:

- validating language and structural identity consistency
- keeping Lemma, Surface, and learner Reading identities distinct
- loading only the storage slice required for the operation
- planning semantic changes and preconditions
- applying Reading Knowledge Changes
- resolving unambiguous Unit Shadows, enforcing direct target conflicts, and
  projecting Lemma-targeted relation algebra without inferred writes

Knowledge DTOs, schemas, and inverse rules come from `dumrel`; Dumdict
owns the dictionary workflows that apply those rules to stored records.

Host storage owns the actual writes. Obsidian can translate planned changes into
markdown edits, SQLite into a transaction, and Electron into server/cache writes.
Non-relation flows load only their operation slice. Relation planning receives
the dictionary relation inventory needed for deterministic inferred views.

## Reading model

`dumdict` keeps three data concerns separate:

- `LemmaRecord`: a grammatical Lemma with no Knowledge
- `ReadingEntry`: learner-facing notes plus optional Reading Knowledge
- `SurfaceEntry`: an owned normalized Surface tied to a Lemma
- `PendingSemanticRelationRecord`: a source Reading, a pending Unit Shadow, and
  its exact storage locator

A `LemmaRecord` stores the grammatical identity:

<!-- README_BLOCK:english-walk-entry-record -->

A Dumling `Reading` is exactly `{ lemma, emojiDescription }`. Multiple Readings
may share the same Lemma while their emoji descriptions distinguish them;
Dumdict adds the learner note and workflow state around that canonical value:

<!-- README_BLOCK:english-walk-reading-entry -->

A `SurfaceEntry` stores a normalized Surface plus its owning structural Lemma:

<!-- README_BLOCK:english-walk-surface-entry -->

Service reads return learner Reading candidates:

<!-- README_BLOCK:service-lookup -->

Semantic Relation buckets live in Reading Knowledge but contain Lemma values.
Dumdict resolves generated Unit Shadows only when one exact Lemma descriptor
matches and stores only the direct claim. Zero-match and ambiguous shadows
remain pending and inert. Inverse, closure, substitution, and later-Reading
consequences are deterministic read projections with provenance.

## Quickstart

Install the packages:

```sh
npm install dumdict dumling dumrel
```

Minimal usage with the in-memory testing storage:

<!-- README_BLOCK:quickstart-walk -->

Production hosts normally call `createDumdictService` with their own storage
port implementation. The storage port maps semantic loads and planned changes to
the host's persistence model.

The root export is intentionally focused:

- `createDumdictService`: creates a language-bound service over a storage port
- DTO types such as `ReadingEntry`, `SurfaceEntry`, and `DumdictReadingDraft`
- `applyDumdictKnowledgeChange`: validates an exact Reading identity and applies
  one Dumrel Knowledge Change
- storage port types for host adapters
- dumling helpers such as `dumling`, `makeSurfaceId`, and `inspectDumlingId`

The version-1 serialized shape is a hard break. Old unversioned,
Reading-targeted relation data must be reset or rewritten by the host; Dumdict
does not expose a compatibility migration.

## Scope

- Languages: `en`, `de`, `he`
- Runtime: `Node >= 24`
- Package format: ESM

For repo development:

- `bun test`
- `bun run build`
- `bun run generate:readme`
