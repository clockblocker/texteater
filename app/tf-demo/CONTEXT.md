# tf-demo Context

tf-demo is one shared product probe over the Texteater packages. It has one
universal linguistic graph and demo dictionary; anonymous Visitors contribute
encounter history but do not partition linguistic identity or Knowledge.

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

**Semantic Relation Edge**:
One normalized direct Reading-owned claim whose endpoint is a Lemma. Resolved
direct and inferred views navigate to Lemma Route Notes with provenance. Only
direct claims are durable. A missing or ambiguous exact Lemma is retained as a
pending Unit Shadow and produces no inferred view; it is not replaced by a
manually selected Reading.
_Avoid_: Reading-to-Reading relation, target Reading

**Unit Reading**:
A Reading whose Lemma Family is Lexeme, Phraseme, or Morpheme. This tf-demo
grouping adds no linguistic identity beyond the underlying Reading.

**Unit Reading Note**:
The primary learner-facing note for one Unit Reading, combining its Knowledge
and navigable links with its Lemma and source Occurrence Attestations. The three
Families shape the note's contents without creating three different note kinds.
_Avoid_: Lexeme Note, Phraseme Note, Morpheme Note

**Source Context**:
A learner-facing projection of one Occurrence Attestation inside its originating
Sentence and Text. A Unit Reading Note accumulates one Source Context per source
occurrence. Each Source Context links back to the Text location and highlights
all member Segments of that occurrence; its return locator adds no linguistic
identity.
_Avoid_: Context, clicked context, Reading identity evidence

**Route Note**:
An optional learner-facing projection of one Occurrence Attestation, Surface,
or Lemma used to traverse the resolution route into and around Unit Reading
Notes. It adds no linguistic identity to the projected value or record.
_Avoid_: Travel Note

**Shadow Note**:
A learner-facing frontier projection of one Unit Shadow together with the
pending relations and structures that refer to it. It neither turns the Unit
Shadow into a provisional Reading nor owns the aggregated references.
_Avoid_: unresolved Reading Note, provisional Unit Reading Note

**Visitor**:
A stable anonymous interaction identity. A Visitor owns only Visitor Encounter
history; it never participates in Text, Sentence, Segment, Grammatical
Resolution, Lemma, Reading, relation, or Knowledge identity.
_Avoid_: Learner, User, account

**Segment Selection**:
One ephemeral Visitor interaction with a Segment. It either opens an already
available Note or starts one operational Resolution Session.
_Avoid_: Click record, Resolution, Occurrence Attestation

**Visitor Encounter**:
The single durable association of one Visitor with one Segment after its first
selection. Later selections reuse it; a committed Occurrence Attestation may
replace its initially absent result.
_Avoid_: Click, interaction event, Visitor Resolution

**Membership Conflict**:
A proposed occurrence whose member Segments overlap a committed Occurrence
Attestation without matching all and only that occurrence's members. It is a
rejected save, not a second analysis or a reason to change either occurrence.

**Analysis Stripping**:
The explicit removal of derived linguistic analysis for one Text while
preserving that Text and its Sentences as source material. It is the only
operation, apart from full demo reset, that ends Occurrence Attestations and
their memberships.

## Generated Semantic Relation containment

tf-demo production Knowledge generation deliberately requests only the
applicable transcription, German definition, and English translation leaves.
It omits Semantic Relations, and its server publication boundary discards any
unexpected model-generated Semantic Relation change or Pending Semantic
Relation before Dumdict can plan canonical edges or relation propagation.

This containment does not change Dumrel applicability, Dumgen's development
and laboratory relation routes, existing relation data, or manual relation
authoring. It may be removed only by the explicit promotion ticket
`texteater#194` under the relation-quality map `texteater#187`.

## Text-scoped analysis stripping

A Text and its Sentences are preserved source material. Stripping analysis
removes the Sentences' Segments, their Attestation Memberships and Occurrence
Attestations, and every Visitor Encounter on those Segments or occurrences. It
never removes the Text or Sentence records.

When stripping leaves a Reading with no surviving Occurrence Attestation, the
Shared Demo Dictionary also removes that Reading, its Reading Knowledge, and
its source-owned relation edges. Incoming relation edges remain valid when a
target Reading disappears because their endpoint is its Lemma; they are removed
only when that Lemma itself is removed. When no other surviving record uses
them, stripping also removes the Lemma and Surfaces. Readings used by another
Text remain shared.
