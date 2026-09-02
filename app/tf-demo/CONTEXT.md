# tf-demo Context

tf-demo presents one shared linguistic graph and demo dictionary. Anonymous
Visitors contribute encounter history but do not partition linguistic identity
or Knowledge.

## Language

**Sheet**:
A placed, expanded presentation of one Text or Note in a Pane's ordered Sheet
Stack. It adds no identity to its subject.
_Avoid_: Layer, expanded Card, View

**Card**:
A transient presentation of one Text or Note in a Card Layer or Sheet Move. It
never belongs to a Sheet Stack or carries Sheet placement and lock semantics.
_Avoid_: collapsed Sheet, unplaced Sheet

**Card Layer**:
A Pane-local transient layer of independent Cards, separate from the Pane's
Sheet Stack. Each Pane has at most one.
_Avoid_: Card Stack, modal overlay

**Card Tail**:
A subject-owned compact presentation at the bottom of an occluded Card. It is
the Card's drag handle, not a tab or reorder handle.

**Workspace Presentation**:
The content-independent `Card | Sheet` contract passed to a Text or Note.
Subject content receives no workspace dimensions.

**Sheet Stack**:
The ordered Sheets placed in one Pane. Only the top Sheet may move; Collapse
reveals a lower Sheet or the Pane base.

**Pane**:
A workspace position containing one Sheet Stack and at most one Locked Sheet.
The central Pane uses the Navigation Anchor as its base.
_Avoid_: panel, docking region

**Active Pane**:
The Pane to which pane-scoped commands apply. Pointer interaction, keyboard
focus, or a successful Sheet Move may make it active.

**Navigation Anchor**:
The non-collapsible base of the central Pane. The Library is its current
presentation, not a synonym.

**Locked Sheet**:
A Sheet protected from Collapse. Its lock is visible, controllable, and unique
within its Pane.
_Avoid_: pinned Note, locked Pane

**Lock Transfer**:
The operation that moves a Pane's lock to another Sheet. Unlocking may leave
the Pane without a Locked Sheet.

**Collapse**:
Removal of one or more Sheets from a stack without removing a Locked Sheet. It
does not create a Card or move a Sheet.

**Explicit Sheet Removal**:
Removal of one identified Sheet, including a Locked Sheet, without promoting a
replacement lock.

**Sheet Opening**:
Placement of a new Sheet based on interaction origin: central from the
Navigation Anchor, local from a Sheet, or explicit from a drag destination.

**Sheet Move**:
Relocation of the top Sheet between Panes, represented transiently as a Card.
Only a valid drop changes placed workspace state.

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

**Unit Reading Note**:
The learner-facing Note for one Unit Reading, combining its Knowledge, Lemma,
and source Occurrence Attestations.

**Source Context**:
A projection of one Occurrence Attestation inside its source Sentence and Text.
Its return locator and highlighting add no linguistic identity. A Unit Reading
Note includes it only when the current Visitor has encountered one of the
occurrence's member Segments.
_Avoid_: clicked context, Reading identity evidence

**Route Note**:
An optional projection of an Attestation, Surface, or Lemma used to traverse
the resolution route. It adds no identity.

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
