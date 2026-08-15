# Relations cleanup

A pending record contains its source Reading, a Dumrel
`PendingSemanticRelation`, and locator
`{ sourceReadingKey, relation, targetPendingId }`.

## Inspection and matching

`getInfoForRelationsCleanup({ canonicalForm })` returns the storage revision,
candidate Lemmas, and pending records with that canonical form. A target
Reading matches only when its schema-normalized Lemma language, canonical form,
Family, and Kind equal all four Unit Shadow fields. Core Features are absent
from the shadow and do not participate.

Zero matches leaves the record pending. One or many matches also leave it
pending until the caller explicitly selects one target or discards the record;
Dumdict never auto-fans-out.

## Resolution

`cleanupRelations` receives the inspection revision and exact locators.
Omitting `targetReading` discards only the exact pending record. Supplying a
target revalidates same-language, exact matching, and direct-self constraints,
then atomically:

1. contributes the forward edge to the source Reading Knowledge;
2. contributes the required inverse edge to the target Reading Knowledge;
3. removes the exact pending record.

A stale revision, missing target, missing pending locator, duplicate
resolution, or failed semantic precondition does not partially write.
