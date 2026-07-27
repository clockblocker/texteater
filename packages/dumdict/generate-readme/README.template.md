# `dumdict`

Semantic glue for dictionary-note applications built on top of `dumling`.

`dumdict` sits between host-owned dictionary storage and user-facing application
workflows. It does not own persistence, sync, serialization, conflict UX, or LLM
calls. A host supplies storage functions at setup time; UI code calls a small
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

The runtime service has three UI-facing operations:

- `findStoredLemmaSenses`: return stored candidates for a resolved lemma description
- `addAttestation`: append evidence to an existing stored sense
- `addNewNote`: create a new note and plan related semantic changes

The surrounding application owns the workflow around those calls. In the normal
flow, the user selects a word, the UI resolves the lemma through its own LLM
flow, `dumdict` returns candidate stored senses, and the UI asks its LLM whether
one candidate matches. If one does, the UI calls `addAttestation`; otherwise it
collects a full note draft and calls `addNewNote`.

`dumdict` owns the dictionary semantics behind those calls:

- validating language and `dumling` ID consistency
- deriving stable IDs from typed `dumling` DTOs
- loading only the storage slice required for the operation
- planning semantic changes and preconditions
- maintaining inverse-paired relations and pending unresolved relation targets

Host storage owns the actual writes. Obsidian can translate planned changes into
markdown edits, SQLite into a transaction, and Electron into server/cache writes.
Normal app flows do not load the full dictionary.

## Entry model

`dumdict` keeps three data concerns separate:

- `LemmaEntry`: the stored dictionary node
- `SurfaceEntry`: the owned resolved surface entry
- pending lemma refs: unresolved relation targets that can be linked later

A `LemmaEntry` stores the stable lemma payload plus graph-level dictionary metadata:

<!-- README_BLOCK:english-walk-lemma-entry -->

A `SurfaceEntry` stores a resolved surface plus an explicit owning lemma ID:

<!-- README_BLOCK:english-walk-surface-entry -->

Service reads return storage-facing lemma sense candidates:

<!-- README_BLOCK:service-lookup -->

## Quickstart

Install the packages:

```sh
npm install dumdict dumling
```

Minimal usage with the in-memory testing storage:

<!-- README_BLOCK:quickstart-walk -->

Production hosts normally call `createDumdictService` with their own storage
port implementation. The storage port maps semantic loads and planned changes to
the host's persistence model.

The root export is intentionally focused:

- `createDumdictService`: creates a language-bound service over a storage port
- DTO types such as `LemmaEntry`, `SurfaceEntry`, `DumdictEntryDraft`, and relation payloads
- storage port types for host adapters
- dumling helpers such as `makeDumlingIdFor` and `inspectDumlingId`

## Scope

- Languages: `en`, `de`, `he`
- Runtime: `Node >= 20`
- Package format: ESM

For repo development:

- `bun test`
- `bun run build`
- `bun run generate:readme`
