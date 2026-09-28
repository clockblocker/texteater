---
status: superseded by ADR-0034
---

# Store preposition government as Reading Knowledge

A governor's lexically governed prepositions were a structured Knowledge
aspect, `governedPrepositions`: each entry named the ADP Lemma and the case it
assigns (`warten`: `auf` + Acc). Only a sentence that attested government
could add an entry, and a per-Reading call guessing valency from the sense was
rejected.

[ADR 0034](./0034-store-valency-as-e-valbu-frames-on-the-reading.md) replaced
the aspect with the Reading's Valency Frame, proposed whole by the Knowledge
call that creates the Reading. What still stands of this ADR, that government
is Reading Knowledge and not a Relation and that a preposition's governors are
a projection, is stated in ADR 0034.
