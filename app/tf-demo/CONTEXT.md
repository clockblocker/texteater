# tf-demo Context

tf-demo is one shared product probe over the Texteater packages. It has one
universal linguistic graph and demo dictionary; anonymous Visitors contribute
interaction history but do not partition linguistic identity or Knowledge.

## Language

**Occurrence Attestation**:
A durable tf-demo record for one resolved high-level occurrence in one
Sentence. Every member Segment shares it; its application-owned database ID
distinguishes value-equal occurrences but never enters the public Dumling
Attestation value.
_Avoid_: Resolved Segment Context, Visitor Context, clicked context,
grammatical resolution record

**Attestation Membership**:
The exclusive association of one Segment with at most one Occurrence
Attestation, carrying that member's `Standard | Typo` orthography evidence.
The ordered memberships of an occurrence reconstruct its Dumling Attestation
members.
_Avoid_: clicked-index context, target alias

**Shared Demo Dictionary**:
The one universal set of Lemmas, Surfaces, Readings, and Knowledge presented by
tf-demo. The package-level learner scope of a Dumdict Reading is the whole demo,
not an anonymous Visitor.
_Avoid_: Visitor Dictionary, personal dictionary

**Visitor**:
A stable anonymous interaction identity. A Visitor owns only Click history;
it never participates in Text, Sentence, Segment, Grammatical Resolution,
Lemma, Reading, relation, or Knowledge identity.
_Avoid_: Learner, User, account

**Click**:
One Visitor interaction with a Segment. Its result is either no Occurrence
Attestation or one committed Occurrence Attestation, and that optional result
remains stable for request retries. Its request identifier provides delivery
idempotency, never linguistic identity or resolution reuse.
_Avoid_: Resolution, Occurrence Attestation

**Membership Conflict**:
A proposed occurrence whose member Segments overlap a committed Occurrence
Attestation without matching all and only that occurrence's members. It is a
rejected save, not a second analysis or a reason to change either occurrence.

**Analysis Stripping**:
The explicit removal of derived linguistic analysis for one Text while
preserving that Text and its Sentences as source material. It is the only
operation, apart from full demo reset, that ends Occurrence Attestations and
their memberships.

## Text-scoped analysis stripping

A Text and its Sentences are preserved source material. Stripping analysis
removes the Sentences' Segments, their Attestation Memberships and Occurrence
Attestations, and every Visitor Click on those Segments or occurrences. It
never removes the Text or Sentence records.

When stripping leaves a Reading with no surviving Occurrence Attestation, the
Shared Demo Dictionary also removes that Reading, its Reading Knowledge and
relations, and—when no other surviving record uses them—its Lemma, Surfaces,
and Lemma Knowledge. Readings used by another Text remain shared.
