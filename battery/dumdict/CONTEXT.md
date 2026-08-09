# Dumdict Context

Dumdict manages learner-owned dictionary records over Dumling's grammatical
entities. It plans storage changes but does not own a host's persistence,
transactions, or synchronization.

## Language

**Lemma Record**:
A stored structural Lemma together with its morphological relations. The
embedded Lemma is grammatical identity; there is no separate opaque Lemma ID.
_Avoid_: Linguistic Entry record, Lemma entry

**Reading**:
The learner-scoped semantic identity formed by exactly one Lemma and one Emoji
Description. Several Readings may share the same Lemma.
_Avoid_: Meaning, Sense, Semantic Unit

**Emoji Description**:
The stable learner-scoped semantic label that distinguishes Readings of the
same Lemma. It participates in Reading identity.

**Reading Entry**:
The learner-facing note content and lexical relations stored for one Reading.
The Reading is its semantic identity; note content does not create a second
semantic identity.
_Avoid_: Meaning Entry, dictionary sense

**Surface Entry**:
A stored Dumling Surface and its owning structural Lemma. The owner must equal
the Lemma realized by that Surface.

**Reading Candidate**:
An existing learner Reading returned for an exact resolved Lemma so the
classifier can reuse it or propose a new Reading.
