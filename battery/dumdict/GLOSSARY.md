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
identity, and the record owns its Lemma Paradigm (Dumrel) and no Knowledge.
See [ADR 0002] and [ADR 0048].
_Avoid_: Linguistic Entry record, Lemma entry

**Reading Entry**:
The learner-facing notes, optional Reading Knowledge and Attestation Links
attached to one exact Reading. Its content does not create another semantic
identity. See [ADR 0002] and [ADR 0049].
_Avoid_: Meaning Entry, dictionary sense

**Surface Entry**:
A dictionary record for one met Surface and the Lemma it realizes. It is
forgotten when it loses its last Attestation Link, unless it holds user text.
See [ADR 0049].

**Attestation Link**:
The durable record of one occurrence: the host's opaque ref, the Surface it
realized and the Reading it was judged to be. See [ADR 0043] and [ADR 0049].
_Avoid_: Attestation, which has no durable identity (Dumling); attestation
string

**Inflection Table**:
One Licence Group's (Dumrel) grid of its Lemma's core panels, derived and met
forms together. It is a projection with no identity, never stored. See
[ADR 0049].
_Avoid_: paradigm, Paradigm Cell, stored table

**Placement**:
Where a Surface sits in a Table Schema (Dumling): it Covers its cells, is
OneOf candidate cells, or is Unplaced. It is never stored. See [ADR 0049].

**Surface Axes**:
Every feature bundle a met Surface fills, shown on its line in the list of
met Surfaces outside the core panels. See [ADR 0049].

**Licence Conflict**:
An occurrence whose form its judged Reading's Licence (Dumrel) doesn't take.
Code flags it and never relicenses or moves it. See [ADR 0048].

**Reading Candidate**:
An existing Reading for an exact Lemma that may be reused instead of creating a
new Reading. See [ADR 0031].

**Semantic Relation Edge**:
A direct claim stored on one Reading, targeting a Lemma or an exact Reading.
Only direct claims persist; inverse and other inferred edges are projected
from them. See [ADR 0011] and [ADR 0012].

**Shadow Relation**:
A Semantic Relation whose target was named as a Unit Shadow. Its record keeps
the Shadow for as long as the relation lives, beside the one Lemma it
resolves to, or none while it is pending. Adding or removing a Lemma the
Shadow matches re-evaluates it, and removing a Lemma turns each exact claim
on it into one. See [ADR 0011].
_Avoid_: resolved pending relation, Shadow-derived claim

**Link Target**:
Where a host's link goes: a Spelling Crossroad, a Lemma, a Reading, or one
met Surface of a Lemma. A link whose exact sense is unknown goes to the one
Lemma its Unit Shadow matches, or else to the Spelling Crossroad. See
[ADR 0011].
_Avoid_: link destination, note target

[ADR 0002]: ../../docs/adr/0002-lemma-is-grammatical-identity-and-reading-is-semantic-identity.md
[ADR 0011]: ../../docs/adr/0011-use-reading-owned-lemma-targeted-semantic-relations.md
[ADR 0012]: ../../docs/adr/0012-store-only-direct-semantic-relation-claims.md
[ADR 0031]: ../../docs/adr/0031-resolve-readings-through-the-emoji-description-alone.md
[ADR 0043]: ../../docs/adr/0043-correct-identity-by-moving-occurrences.md
[ADR 0048]: ../../docs/adr/0048-keep-paradigm-variants-on-the-lemma-and-license-them-per-reading.md
[ADR 0049]: ../../docs/adr/0049-tabulate-a-lemmas-forms-as-projections.md
