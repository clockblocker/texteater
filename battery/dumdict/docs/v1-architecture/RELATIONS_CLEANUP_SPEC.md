# Relations cleanup

A pending record contains its source Reading, a Dumrel
`PendingSemanticRelation`, and locator
`{ sourceReadingKey, relation, targetPendingId }`.

## Inspection and matching

`getInfoForRelationsCleanup({ canonicalForm })` returns the storage revision,
candidate Lemmas, and pending records with that canonical form. A target
Lemma matches only when its schema-normalized language, canonical form,
Family, and Kind equal all four Unit Shadow fields. Core Features are absent
from the shadow and do not participate.

Zero matches leave the record pending. One match resolves to that Lemma. Two
or more matches remain pending and inert because the Unit Shadow does not
identify one exact Lemma.

## Resolution

`cleanupRelations` receives the inspection revision and exact locators. Code
revalidates exact matches and same-language/same-Lemma constraints, then
atomically:

1. contributes the direct edge to the source Reading Knowledge;
2. removes the exact pending record.

Inverse and other permitted graph consequences are projected at read time.

A stale revision, missing pending locator, duplicate
resolution, or failed semantic precondition does not partially write.
