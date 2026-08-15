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

The runtime service has five UI-facing operations:

- `findStoredReadings`: return learner Readings for an exact structural Lemma
- `addAttestation`: append evidence to an existing Reading
- `addNewNote`: store a Lemma and a new learner Reading
- `getInfoForRelationsCleanup`: inspect unresolved relation targets
- `cleanupRelations`: link or discard unresolved relation targets

The surrounding application owns the workflow around those calls. In the normal
flow, the user clicks a text segment, the UI resolves its Surface and Lemma
through its own LLM flow, `dumdict` returns candidate stored Readings, and the UI asks its LLM whether
one candidate matches. If one does, the UI calls `addAttestation`; otherwise it
collects a full note draft and calls `addNewNote`.

`dumdict` owns the dictionary semantics behind those calls:

- validating language and structural identity consistency
- keeping Lemma, Surface, and learner Reading identities distinct
- loading only the storage slice required for the operation
- planning semantic changes and preconditions
- applying owner-associated Knowledge Changes
- maintaining inverse-paired Semantic Relations and explicit pending work

Knowledge DTOs, schemas, and inverse rules come from `dumrel`; Dumdict
owns the dictionary workflows that apply those rules to stored records.

Host storage owns the actual writes. Obsidian can translate planned changes into
markdown edits, SQLite into a transaction, and Electron into server/cache writes.
Normal app flows do not load the full dictionary.

## Reading model

`dumdict` keeps three data concerns separate:

- `LemmaRecord`: a grammatical Lemma plus optional Lemma Knowledge
- `ReadingEntry`: learner-facing notes plus optional Reading Knowledge
- `SurfaceEntry`: an owned normalized Surface tied to a Lemma
- `PendingSemanticRelationRecord`: a source Reading, a pending Unit Shadow, and
  its exact storage locator

A `LemmaRecord` stores the grammatical identity:

<!-- README_BLOCK:english-walk-entry-record -->

A `Reading` is exactly `{ lemma, emojiDescription }`. Multiple Readings may
share the same Lemma while their emoji descriptions distinguish them:

<!-- README_BLOCK:english-walk-reading-entry -->

A `SurfaceEntry` stores a normalized Surface plus its owning structural Lemma:

<!-- README_BLOCK:english-walk-surface-entry -->

Service reads return learner Reading candidates:

<!-- README_BLOCK:service-lookup -->

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
- `applyDumdictKnowledgeChange`: validates an exact owner and applies one
  owner-compatible Dumrel Knowledge Change
- explicit version-0-to-version-1 serialized-note migration with typed loss
  failures
- storage port types for host adapters
- dumling helpers such as `dumling`, `makeSurfaceId`, and `inspectDumlingId`

## Scope

- Languages: `en`, `de`, `he`
- Runtime: `Node >= 24`
- Package format: ESM

For repo development:

- `bun test`
- `bun run build`
- `bun run generate:readme`
