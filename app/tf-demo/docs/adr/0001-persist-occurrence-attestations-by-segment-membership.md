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
Readings in the parent commit: an article's DET cell and a subject expletive
`es`. Components receive no Occurrence Attestation or Visitor Encounter. Shared
article evidence is persisted separately from membership; highlighting
continues to mark owned members only. A source click on an owned article
follows its Head's route and contributes no DET Source Context.

The article's DET cell comes from the article's spelling and its Head's case,
number and gender, derived in dumspec (system ADRs 0040 and 0041). Until
ADR 0040 it came from a noun `article` feature, and tf-demo's code still reads
that until it is rebuilt after the segmentation rewrite
([#701](https://github.com/clockblocker/texteater/issues/701)).

Amended 2026-10-02 ([#848](https://github.com/clockblocker/texteater/issues/848)):
tf-demo no longer reads a noun `article` feature. A common noun's owned
article is still a member of its occurrence, but it derives no DET Reading
until [#683](https://github.com/clockblocker/texteater/issues/683) derives the
cell through dumspec. A name cited with its definite article (die Schweiz)
still derives its der cell, and a subject expletive `es` its reviewed Reading.

