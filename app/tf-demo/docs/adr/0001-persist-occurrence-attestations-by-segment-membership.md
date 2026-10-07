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

Derived components materialize dictionary Lemmas, Surfaces and exact reviewed
Readings in the parent commit: the `der` cell of a name cited with its
definite article (`die Schweiz`), and the reviewed Reading of a subject
expletive `es`. Components receive no Occurrence Attestation or Visitor
Encounter. Shared article evidence is persisted separately from membership;
highlighting continues to mark owned members only. A source click on an owned
article follows its Head's route and contributes no DET Source Context.

A common noun's owned article is a member of its occurrence. Its DET cell
comes from the article's spelling and its Head's case, number and gender,
derived in dumcorpus (system ADRs 0040 and 0041). tf-demo reads no noun
`article` feature, so until dumcorpus derives that cell, a common noun's
owned article derives no DET Reading.
