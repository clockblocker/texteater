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

- `addNewNote`: store a Lemma and a new learner Reading, re-evaluating the stored Shadows the Lemma matches
- `applyGeneratedKnowledge`: plan generated Knowledge Changes and pending relations for an existing Reading
- `ensureReadingEntry`: create or verify an ordinary Reading entry, re-evaluating the stored Shadows a Lemma it creates matches
- `ensureOwnedSurface`: attach a newly encountered Surface to an existing Reading's Lemma
- `recordOccurrence`: record one occurrence as an Attestation Link, ensuring its Surface
- `removeOccurrence`: remove an occurrence's links and what they leave behind: an unlinked Reading, a Surface that lost its last link and holds no user text, a Lemma with no Readings, and the claims other Readings held on them
- `reconcileAttestationLinks`: merge the links concurrent writers stored for one ref, keeping one
- `rekeySurfaces`: rewrite Surface Entries and the links naming them after a Dumling Surface change
- `cleanupRelations`: re-evaluate the Shadows of exact pending locators
- `reevaluateShadows`: re-evaluate every stored Shadow that matches Lemmas the host removed, or Shadows it names, and move the claims on the removed Lemmas

Each returns a validated plan, a rejection, or a conflict:

<!-- README_BLOCK:quickstart-run -->

The surrounding application owns the workflow around those calls. In the normal
flow, the user clicks a text segment, the UI resolves its Surface and Lemma
through its own LLM flow, the host reads the stored Readings for that Lemma,
and the UI asks its LLM whether one matches. If none does, the host plans
`addNewNote`; otherwise it plans `recordOccurrence` or
`applyGeneratedKnowledge` for the matched Reading.

`dumdict` owns the dictionary workflow semantics behind those calls:

- validating language and structural identity consistency
- keeping Lemma, Surface, and learner Reading identities distinct
- naming the storage slice each operation needs
- planning semantic changes and preconditions
- applying Reading Knowledge Changes
- resolving unambiguous Unit Shadows and keeping each resolution current as
  Lemmas change, enforcing direct target conflicts, and projecting
  Lemma-targeted relation algebra without inferred writes

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

- `LemmaRecord`: a grammatical Lemma and its Lemma Paradigm, with no Knowledge
- `ReadingEntry`: learner-facing notes, optional Reading Knowledge and the
  Attestation Links of the occurrences judged to be the Reading
- `SurfaceEntry`: an owned normalized Surface tied to a Lemma
- `PendingSemanticRelationRecord`: a source Reading, a Unit Shadow, its exact
  storage locator, and the Lemma the Shadow resolves to, if exactly one
  matches

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
Dumdict resolves a generated Unit Shadow only when exactly one Lemma matches
it, stores the direct claim, and keeps the Shadow on its record. Zero-match
and ambiguous Shadows remain pending and inert. Adding or removing a matching
Lemma re-evaluates the record, so a claim moves back to pending when a second
Lemma matches (der See, die See) and forward again when one leaves (system
ADR 0011). Removing a Lemma turns each exact claim on it into its Shadow
relation, and removing a Reading retracts each Reading-mode claim on it, in
the plan that removes them. Inverse, closure, substitution, and later-Reading consequences are
deterministic read projections with provenance.

## Quickstart

Install the packages:

```sh
npm install dumdict dumling dumrel
```

The root export is intentionally focused:

- record and plan types such as `ReadingEntry`, `SurfaceEntry`, and `DumdictPlan`
- the lightweight `parseAs*` parsers for stored records and plans
- `makeSurfaceId`: the stable ID of an owned Surface
- `reconcileAttestationLinks` and `reconcileLemmaParadigms`, which merge
  concurrent writers' copies
- `LinkTarget`, the place a host's link goes (a Spelling Crossroad, a Lemma,
  a Reading or a met Surface), with `resolveShadow`, the pure match rule for a
  link whose exact sense is unknown, and `pendingRelationTarget`, a stored
  relation's current target

The planner lives in `dumdict/planning`, so a transaction loads none of the
root's parsers it does not use. That entry also carries the request and
storage slice types host adapters need, and `applyDumdictKnowledgeChanges`,
which validates an exact Reading identity and applies a patch's Dumrel
Knowledge Changes in order. Hosts outside this repository, such as an
Obsidian plugin over markdown files, a Node server over SQLite, or an Electron
app with a local cache, are future work; each would implement the slice reads
and atomic commit the conformance suite checks.

A serialized note is version 2: one Lemma with its Paradigm, its Readings
with their Attestation Links, its Surfaces and its pending relations. Any
older note is a hard break the host must reset or rewrite.

## Inflection tables

`dumdict/inflection` projects a Lemma's Inflection Tables (system ADR 0049).
It is pure: no storage, no language, no labels. A language's
`InflectionPack` from `dumcorpus/inflection` is its only language seam:
Table Schemas with their core panels per Kind, an opaque form type, the
derivation of a Licence Group's forms, and the display and labels the host
applies.

- `projectLemmaTables(pack, slice)` takes a `LemmaSlice` (or any slice with
  its Lemma Record, Reading Entries and Surface Entries) and answers one
  table per Licence Group of core panels only, every met Surface with its
  Surface Axes, and the Licence Conflicts. Derived and met forms are merged
  per cell by the pack's form key. A met form stands in every cell, of every
  group, whose variants derive it or leave it Unknown; one only OneOf its
  cells is `uncertain` there. A form no variant derives flags its cell
  `undescribed`, and is listed, not written.
- `placeSurface(schema, surface)` answers Covers, OneOf or Unplaced, and
  `surfaceAxes(schema, surface)` every feature bundle the Surface fills.

A host draws each group's panels as grids, captioned with the group's
Readings, applying `pack.labels` to panels, rows and columns and
`pack.display` to each form. Beside them it lists the Surface lines that
are not `inCore`, each labelled with `pack.labels.bundle` per bundle of its
axes and linked to its Surface. The view is plain data, the same for the
same slice in any order; a host may cache it on `pack.version` and
`schema.version`, and key a group's Block on its `selectionKey`.

## Scope

- Languages: `en`, `de`, `he`
- Runtime: `Node >= 24`
- Package format: ESM

For repo development:

- `bun run test`
- `bun run build`
- `bun run generate:readme`
