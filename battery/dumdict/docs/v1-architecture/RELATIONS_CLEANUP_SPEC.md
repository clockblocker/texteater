# Relations cleanup

> **Superseded terminology:** This document predates ADR 0002 and is retained
> as pre-refactor design history. Use `battery/dumdict/CONTEXT.md` and the
> generated package README for the current Lemma/Reading model and API.

Pending relations retain useful graph intent when the target Entry has not yet
been resolved.

## Inspection

`getInfoForRelationsCleanup({ citationForm })` returns:

- the storage revision
- candidate Linguistic Entry IDs with that Citation Form
- pending lexical and morphological relations whose target descriptions use
  that Citation Form

The candidate list is advisory. Matching descriptive fields never prove Entry
identity.

## Resolution

`cleanupRelations` receives the inspection revision and explicit resolutions.

- A lexical resolution uses `sourceMeaningId` and may name
  `targetMeaningId`.
- A morphological resolution uses `sourceLinguisticEntryId` and may name
  `targetLinguisticEntryId`.
- Omitting the target deletes the pending relation without creating a resolved
  edge.

When a target is supplied, Dumdict validates that the target's Entry matches
the pending description, rejects self-relations, creates the forward and
inverse edges, deletes the pending edge, and deletes the pending ref once it
has no incoming pending relations.

A stale revision, missing target, or missing pending edge produces a conflict.
Duplicate or family-mismatched resolutions are rejected.
