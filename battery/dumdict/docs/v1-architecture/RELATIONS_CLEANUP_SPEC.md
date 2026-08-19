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

Zero matches leaves the record pending. One match resolves to that Lemma. Two
or more matches choose one forward Lemma by the stable full-Lemma comparator,
independent of storage order, while inverse materialization covers every
Reading owned by every matching Lemma.

## Resolution

`cleanupRelations` receives the inspection revision and exact locators. Code
revalidates exact matches and same-language/same-Lemma constraints, then
atomically:

1. contributes the forward edge to the source Reading Knowledge;
2. contributes the required inverse edges across matching Lemma Readings;
3. removes the exact pending record.

A stale revision, missing pending locator, duplicate
resolution, or failed semantic precondition does not partially write.
