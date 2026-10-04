# `dumdict`

Semantic glue for dictionary-note applications built on top of `dumling`.

`dumdict` sits between host-owned dictionary storage and user-facing application
workflows. It does not own persistence, sync, conflict UX, or LLM calls. A host
loads the storage slice a request needs, asks `dumdict` for a plan, and applies
that plan in the same transaction.

## Core idea

`dumdict/planning` exports a synchronous planner bound to one language. It
never reads or writes storage:

<!-- README_BLOCK:planner-context -->

The planner's workflows each take that host-loaded slice and a request:

- `addNewNote`: store a Lemma and a new learner Reading
- `applyGeneratedKnowledge`: plan generated Knowledge Changes and pending relations for an existing Reading
- `ensureReadingEntry`: create or verify an ordinary Reading entry
- `ensureOwnedSurface`: attach a newly encountered Surface to an existing Reading's Lemma
- `cleanupRelations`: retry unresolved targets through deterministic Lemma resolution

Each returns a validated plan, a rejection, or a conflict:

<!-- README_BLOCK:quickstart-run -->

The surrounding application owns the workflow around those calls. In the normal
flow, the user clicks a text segment, the UI resolves its Surface and Lemma
through its own LLM flow, the host reads the stored Readings for that Lemma,
and the UI asks its LLM whether one matches. If none does, the host plans
`addNewNote`; otherwise it plans `ensureOwnedSurface` or
`applyGeneratedKnowledge` for the matched Reading.

`dumdict` owns the dictionary workflow semantics behind those calls:

- validating language and structural identity consistency
- keeping Lemma, Surface, and learner Reading identities distinct
- naming the storage slice each operation needs
- planning semantic changes and preconditions
- applying Reading Knowledge Changes
- resolving unambiguous Unit Shadows, enforcing direct target conflicts, and
  projecting Lemma-targeted relation algebra without inferred writes

Knowledge DTOs, schemas, and inverse rules come from `dumrel`; Dumdict
owns the dictionary workflows that apply those rules to stored records.

`dumdict/schema` is the explicit Zod composition surface for broad aggregate
DTO schemas. It is never re-exported from `dumdict` or `dumdict/planning`.
Application validation should use Dumdict's lightweight parser interfaces
instead.

Host storage owns the actual writes. A host parses each planned change with
`parseAsPlannedChangeOp`, checks its preconditions together with
`impliedChangePreconditions`, and applies the whole list atomically.
`dumdict/testing` exports `describeStorageConformance`, a bun test suite that
proves a store applies plans the same way as Dumdict's reference store.
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

A Dumling `Reading` is exactly `{ lemma, emojiDescription }`, or `{ lemma }`
for a Foreign Lemma, which has one Reading. Multiple Readings may share the
same Lemma while their emoji descriptions distinguish them; Dumdict adds the
learner note and workflow state around that canonical value:

<!-- README_BLOCK:english-walk-reading-entry -->

A `SurfaceEntry` stores a normalized Surface plus its owning structural Lemma:

<!-- README_BLOCK:english-walk-surface-entry -->

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

The root export is intentionally focused:

- DTO types such as `ReadingEntry`, `SurfaceEntry`, and `DumdictReadingDraft`
- `applyDumdictKnowledgeChange`: validates an exact Reading identity and applies
  one Dumrel Knowledge Change
- the lightweight `parseAs*` parsers for stored records and plans
- request and storage slice types for host adapters
- `makeSurfaceId`: the stable ID of an owned Surface

The planner lives in `dumdict/planning`, so a transaction loads none of the
root's parsers it does not use. Hosts outside this repository, such as an
Obsidian plugin over markdown files, a Node server over SQLite, or an Electron
app with a local cache, are future work; each would implement the slice reads
and atomic commit the conformance suite checks.

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
