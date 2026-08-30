# Dumdict

Dumdict manages dictionary-scoped records over Dumling grammatical and semantic
values.

## Language

**Dictionary Scope**:
The learner or hosted boundary within which Reading equality and dictionary
records apply.
_Avoid_: Reading owner, user ID

**Lemma Record**:
A dictionary record for one structural Lemma. The Lemma is its grammatical
identity and owns no Knowledge.
_Avoid_: Linguistic Entry record, Lemma entry

**Reading Entry**:
The learner-facing notes and optional Reading Knowledge attached to one exact
Reading. Its content does not create another semantic identity.
_Avoid_: Meaning Entry, dictionary sense

**Surface Entry**:
A dictionary record for one Surface and the Lemma it realizes.

**Reading Candidate**:
An existing Reading for an exact Lemma that may be reused instead of creating a
new Reading.

**Semantic Relation Edge**:
A direct Reading-owned claim with either a Lemma or exact Reading target. One
Reading Knowledge value uses a single target mode.

**Grammatical Relation Edge**:
A direct Grammatical Relation claim whose endpoints are both Lemmas or both
exact Readings.
