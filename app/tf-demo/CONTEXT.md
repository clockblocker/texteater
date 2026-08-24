# tf-demo Context

tf-demo is one shared product probe over the Texteater packages. It has one
universal linguistic graph and demo dictionary; anonymous Visitors contribute
encounter history but do not partition linguistic identity or Knowledge.

## Language

### Workspace presentation

**Sheet**:
A placed, expanded workspace presentation of one Text or Note. Sheets at the
same Pane form an ordered Sheet Stack; a Sheet adds no identity to its subject,
and multiple Sheets may present the same subject.
_Avoid_: Layer, expanded Card, View

**Card**:
The transient compact preview of a Text or Note shown during a Sheet Move or an
explicit preview gesture. A Card never belongs to a Sheet Stack or constitutes
valid placed workspace state.
_Avoid_: collapsed Sheet, Note Card, unplaced Sheet

**Sheet Stack**:
The ordered Sheets placed at one Pane. Collapsing Sheets reveals lower Sheets
or that Pane's base; only the top Sheet may move.
_Avoid_: Card Stack, Layer Stack

**Pane**:
One workspace position that holds one Sheet Stack. The central Pane has the
Navigation Anchor as its base; incidental Panes have an empty base. Each Pane
may contain at most one Locked Sheet.
_Avoid_: side region, docking region, panel

**Active Pane**:
The one Pane to which pane-scoped workspace operations apply. Activity is
workspace state that follows pointer interaction, keyboard focus, or a
successful Sheet Move into that Pane.
_Avoid_: focused Pane, selected Pane

**Navigation Anchor**:
The non-collapsible base of the central Pane, revealed when its Sheet Stack is
empty. The Library is its current presentation, not a synonym for the anchor.
_Avoid_: Home Pane, Navigator Pane

**Locked Sheet**:
A Sheet carrying visible, explicitly controllable protection from Collapse.
Every Sheet is eligible, the first Sheet placed into an empty Pane locks
automatically, and its lock follows it during a Sheet Move unless the
destination already has a Locked Sheet.
_Avoid_: locked Text, pinned Note, locked Pane

**Lock Transfer**:
The explicit Pane-scoped operation that changes which Sheet carries its one
lock. Locking an ordinary Sheet unlocks the previously Locked Sheet; unlocking
the Locked Sheet leaves that Pane without a lock.
_Avoid_: second lock, lock copy

**Collapse**:
Removal of one or more Sheets from a Sheet Stack, revealing what is beneath.
Collapse is distinct from moving a Sheet, does not turn it into a Card, and
cannot remove a Locked Sheet.
_Avoid_: close Card, move

**Explicit Sheet Removal**:
Deliberate removal of one identified Sheet. It may remove a Locked Sheet and
never promotes a remaining Sheet to carry the departed lock.
_Avoid_: Collapse, unlock

**Sheet Opening**:
Placement of a new Sheet according to its interaction origin. The Navigation
Anchor opens onto the central Pane, Sheet-local activation pushes onto that
Sheet's Pane, and dragging chooses a destination Pane explicitly.
_Avoid_: route navigation, global open

**Sheet Move**:
Relocation of the top Sheet between Panes, represented transiently as a Card.
Only a valid drop commits the move by removing the source's top Sheet and
pushing it onto the destination; the moved subject and its linguistic identity
remain unchanged, and the source never promotes a replacement Locked Sheet.
_Avoid_: Collapse, copy

### Linguistic and application domain

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

**Fixed Member Loading**:
The idempotent application setup operation that reconciles package-owned fixed
Lemmas, Readings, Reading Knowledge, and direct Grammatical Relation claims
into the Shared Demo Dictionary through their ordinary records and identities.

**Catalog Growth Signal**:
A durable application-owned aggregate of equivalent Catalog Misses used to
prioritize additions to package-owned Fixed Catalogs. It is operational
diagnostic evidence, not linguistic identity or Visitor history.

**Semantic Relation Edge**:
One normalized direct Reading-owned claim whose endpoint mode is either Lemma
or exact Reading. Resolved direct and inferred views preserve that endpoint
mode and provenance. Only direct claims are durable. A missing or ambiguous
generated Lemma target is retained as a pending Unit Shadow and produces no
inferred view.

**Grammatical Relation Edge**:
One normalized direct Case Counterpart, Person Counterpart, or Number
Counterpart claim. tf-demo stores its homogeneous endpoints and projects the
symmetric reverse without Semantic Relation settings, propagation, closure, or
substitution. Exact Reading targets open the exact Unit Reading Note.

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
