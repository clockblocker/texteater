# Dumdict

Dumdict manages dictionary-scoped records over Dumling grammatical and semantic
values. Each entry links the ADRs that hold the term's precise definition, edge
cases and examples.

## Language

**Dictionary Scope**:
The learner or hosted boundary within which Reading equality and dictionary
records apply. See [ADR 0002].
_Avoid_: Reading owner, user ID

**Lemma Record**:
A dictionary record for one structural Lemma. The Lemma is its grammatical
identity and owns no Knowledge. See [ADR 0002].
_Avoid_: Linguistic Entry record, Lemma entry

**Reading Entry**:
The learner-facing notes and optional Reading Knowledge attached to one exact
Reading. Its content does not create another semantic identity. See
[ADR 0002].
_Avoid_: Meaning Entry, dictionary sense

**Surface Entry**:
A dictionary record for one Surface and the Lemma it realizes.

**Reading Candidate**:
An existing Reading for an exact Lemma that may be reused instead of creating a
new Reading. See [ADR 0031].

**Semantic Relation Edge**:
A direct claim stored on one Reading, targeting a Lemma or an exact Reading.
Only direct claims persist; inverse and other inferred edges are projected
from them. See [ADR 0011] and [ADR 0012].

[ADR 0002]: ../../docs/adr/0002-lemma-is-grammatical-identity-and-reading-is-semantic-identity.md
[ADR 0011]: ../../docs/adr/0011-use-reading-owned-lemma-targeted-semantic-relations.md
[ADR 0012]: ../../docs/adr/0012-store-only-direct-semantic-relation-claims.md
[ADR 0031]: ../../docs/adr/0031-resolve-readings-through-the-emoji-description-alone.md
