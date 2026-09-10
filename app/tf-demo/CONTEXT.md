# tf-demo Context

tf-demo presents one shared linguistic graph and demo dictionary. Anonymous
Visitors contribute encounter history but do not partition linguistic identity
or Knowledge.

## Language

The [react-resizable-panels workspace context](../../battery/react-resizable-panels/CONTEXT.md)
defines Presentation, Card, Sheet, Pane, Card Layer, Sheet Stack, Lift, Expand,
Collapse, Move, Close, and cancellation. tf-demo uses that model in production.

**Library Sheet**:
The initial Locked Sheet containing the Library.

**Text Sheet**:
A Locked Sheet containing a Text Subject.

**Note Presentation**:
A Reading, Lemma, Surface, Attestation, Shadow, Resolution, or Resolution Step
Subject in Card or Sheet form.

**Workspace Persistence**:
The placed Sheet composition and the Card Layer membership needed to return an
expanded Note are durable browser state. Resting Card Layers and active
gestures are transient.

**Occurrence Attestation**:
tf-demo's durable record for one resolved high-level occurrence in one
Sentence. Its database ID is application identity and is absent from the public
Dumling Attestation value.

**Attestation Membership**:
The exclusive link from one Segment to at most one Occurrence Attestation. It
carries member orthography; ordered memberships reconstruct Attestation members.

**Shared Demo Dictionary**:
The universal tf-demo set of Lemmas, Surfaces, Readings, and Knowledge. Visitor
identity never scopes its records.

**Supported Target Language**:
A target language for which tf-demo provides resolution and learner-facing
Notes.

**Fixed Member Loading**:
Idempotent reconciliation of package-owned fixed linguistic values into the
Shared Demo Dictionary through ordinary application records.

**Catalog Growth Signal**:
An application-owned aggregate of equivalent Catalog Misses. It is diagnostic
evidence, not linguistic identity or Visitor history.

**Semantic Relation Edge**:
A normalized direct Reading-owned claim targeting either a Lemma or exact
Reading. Only direct claims persist; missing targets remain pending Unit Shadows.

**Grammatical Relation Edge**:
A direct Case, Person, or Number Counterpart claim with homogeneous endpoints.
tf-demo projects its symmetric reverse without Semantic Relation inference.

**Unit Reading**:
A Reading whose Lemma family is Lexeme, Phraseme, or Morpheme. The grouping adds
no identity.

**Reading Note**:
The learner-facing Note for one Unit Reading, combining its Knowledge, Lemma,
and source Occurrence Attestations.

**Source Context**:
A projection of one Occurrence Attestation inside its source Sentence and Text.
Its return locator and highlighting add no linguistic identity. A Reading
Note includes it only when the current Visitor has encountered one of the
occurrence's member Segments.
_Avoid_: clicked context, Reading identity evidence

**Lemma Note**:
A projection of one Lemma and its Readings. It adds no identity beyond the
Lemma and Reading records it presents.

**Surface Note**:
A projection of one normalized orthographic form in one language, aggregating
its typed Lemma analyses without assigning the Note an outer Family or Kind.

**Active Surface Analysis**:
The analysis selected by the context that opened one Surface Note Presentation.
It belongs to that Presentation, so another Presentation may select differently.

**Attestation Note**:
A learner-facing projection of one durable Occurrence Attestation that follows
its resolved Reading route. It adds no identity.

**Shadow Note**:
A projection of one Unit Shadow and the pending references to it. It does not
turn that Shadow into a provisional Reading.

**Visitor**:
A stable anonymous interaction identity that owns only Visitor Encounter
history.
_Avoid_: Learner, User, account

**Segment Selection**:
An ephemeral Visitor command that presents a stored route or starts one
Resolution Session.
_Avoid_: Click record, Resolution

**Segment Resolution State**:
The shared current outcome for an unattested Segment: `Active`, `Unresolved`,
or `PermanentFailure`. A Visitor sees it only after encountering that Segment.
Committed Attestation Membership replaces and clears it.
_Avoid_: Visitor status, Attestation state

**Resolution Step Note**:
A transient projection reached by one Resolution Session. After commit it
converges to the canonical Note subject.

**Visitor Encounter**:
The single durable association of one Visitor with one Segment after its first
selection, carrying its Text and Sentence locator. Later selections reuse it;
an occurrence is encountered when any of its member Segments was encountered.

**Membership Conflict**:
A rejected occurrence proposal that overlaps a committed Occurrence
Attestation without matching all and only its members.

**Analysis Stripping**:
Removal of derived analysis for one Text while preserving the Text and its
Sentences. Apart from full reset, it is the only operation that ends Occurrence
Attestations and memberships.
