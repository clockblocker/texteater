---
status: accepted
---

# Persist occurrence Attestations by exclusive Segment membership

tf-demo stores one occurrence-specific Attestation for each resolved
high-level unit in a Sentence. Each member Segment belongs to at most one such
record and stores its orthography evidence; ordered memberships reconstruct the
identityless public Dumling Attestation. The tf-demo database ID distinguishes
value-equal occurrences but never enters that public value. Occurrences are
immutable after the first valid atomic commit with their canonical Surface,
Lemma, Reading, dictionary changes, memberships, and Visitor Encounter.

A repeated request or click on any member reuses the committed occurrence. A
proposal whose members are all unclaimed may commit; partial overlap is a
Membership Conflict and commits nothing. Analysis Stripping and full reset are
the only operations that remove occurrence records.
