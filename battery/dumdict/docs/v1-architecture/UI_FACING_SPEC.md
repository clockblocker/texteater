# UI-facing service

> **Superseded terminology:** This document predates ADR 0002 and is retained
> as pre-refactor design history. Use `battery/dumdict/CONTEXT.md` and the
> generated package README for the current Lemma/Reading model and API.

```ts
const dict = createDumdictService({ language: "en", storage });
```

## `findStoredMeanings`

```ts
await dict.findStoredMeanings({ linguisticEntryId });
```

The caller must already have resolved the exact opaque Entry ID. The result
contains zero or more `{ meaningId, note }` candidates for that identity.

## `addAttestation`

```ts
await dict.addAttestation({ meaningId, attestation });
```

Attestations enrich learner Meaning records, not Linguistic Entries.

## `addNewNote`

The draft contains:

- a resolved `linguisticEntry`
- a new Meaning ID and `MeaningContent`
- learner evidence fields
- optional owned Surfaces
- optional lexical or morphological relations

If the Entry already exists, the operation may add another Meaning to it.
Duplicate Meaning IDs are rejected.

## Relation cleanup

```ts
const info = await dict.getInfoForRelationsCleanup({ citationForm: "swim" });
await dict.cleanupRelations({
  baseRevision: info.revision,
  resolutions,
});
```

Each lexical resolution names a source Meaning and optional target Meaning.
Each morphological resolution names a source Entry and optional target Entry.
Omitting the target discards that pending relation.

## Results

Mutations return `applied`, `conflict`, or `rejected`. Applied results include
base and next revisions plus affected Entry, Meaning, Surface, and pending IDs.
Conflicts are retryable storage or semantic-precondition failures. Rejections
represent invalid domain requests.
