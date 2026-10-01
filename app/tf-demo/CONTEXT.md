# tf-demo Context

tf-demo presents one shared linguistic graph and demo dictionary. Anonymous
Visitors contribute encounter history but do not partition linguistic identity
or Knowledge. Each entry links the ADRs that hold the term's precise
definition, edge cases and examples.

## Language

The [react-resizable-panels workspace context](../../battery/react-resizable-panels/CONTEXT.md)
defines Presentation, Card, Sheet, Pane, Card Layer, Sheet Stack, Lift, Expand,
Collapse, Close, and cancellation. tf-demo uses that model in production.

**Library Sheet**:
The initial Locked Sheet containing the Library. See [tf-demo ADR 0003].

**Text Sheet**:
A Locked Sheet containing a Text Subject. See [tf-demo ADR 0003].

**Note Presentation**:
A Subject such as a Reading, a Surface or a Resolution Step, presented as a
Note in Card or Sheet form. It is one element in every form, and its Blocks
adapt. See [tf-demo ADR 0006].

**Deck**:
The Cards dealt for one selection, attached to the Sheet they were dealt from.
A Sheet has at most one Deck.
_Avoid_: pile

**Block**:
One ordered member of a Note's content. It reads the Presentation's form and
renders accordingly. See [tf-demo ADR 0006].

**Heading Block**:
The pinned first Block naming the Note's Subject. It is the lift handle in
every form. See [tf-demo ADR 0006].

**Source Contexts Block**:
The pinned Block listing where the Subject was met. See [tf-demo ADR 0006].

**Valency Block**:
The Block showing a Reading's Lemma with its Valency Frame. A German ADP
Reading has no frame, and its block renders from dumspec's ADP Case Table
instead. See [ADR 0034].

**Fusion Block**:
The Attestation Note Block for a fused word that the Attestation holds a piece
of: the fused word and the words it stands for, such as `im = in + dem`. See
[ADR 0035].

**Anchor Blocks**:
The Heading and Source Contexts, which stay visible across every form so the
Presentation reads as one thing while it changes. See [tf-demo ADR 0006].
_Avoid_: header, card tail content

**Workspace Persistence**:
The workspace state that survives a reload: the placed Sheets and the Card
Layer membership an expanded Note needs to return. See [tf-demo ADR 0003].

**Occurrence Attestation**:
tf-demo's durable record for one resolved high-level occurrence in one
Sentence. Its database ID is application identity and never enters the public
Dumling Attestation value. See [tf-demo ADR 0001].

**Attestation Membership**:
The exclusive link from one Segment to at most one Occurrence Attestation,
carrying the member's orthography. Ordered memberships reconstruct the
Attestation's members. See [tf-demo ADR 0001], [ADR 0035] and
[Dumgen ADR 0004].
_Avoid_: Segment index link

**Stored Segment**:
One Segment of a stored Sentence. tf-demo stores a fused word as its pieces,
one Segment per component, and refuses a stored Sentence that holds a whole
fused word. See [ADR 0035].
_Avoid_: token, word

**Sentence Analysis**:
What the legacy intake produced for one German Sentence, stored with it and
read at selection time so that a click selects the largest resolved unit at
the clicked Segment. It is a hint for resolution, not linguistic identity.
[Dumgen ADR 0007] replaces it with biggest units whose route segmentation
chose, so a click never classifies; tf-demo keeps the legacy form until its
rebuild after the segmentation rewrite. See [Dumgen ADR 0006].
_Avoid_: precomputed resolution, Unit map, Analysis Target list

**Shared Demo Dictionary**:
The universal tf-demo set of Lemmas, Surfaces, Readings, and Knowledge. Visitor
identity never scopes its records.

**Supported Target Language**:
A target language for which tf-demo provides resolution and learner-facing
Notes.

**Catalog Growth Signal**:
An application-owned aggregate of equivalent Catalog Misses. It is diagnostic
evidence, not linguistic identity or Visitor history.

**Reviewed Grammatical Alternative**:
A reviewed authored Reading reached by Grammatical Navigation from another
reviewed member. It can be opened before any Text has attested it. See
[ADR 0019].

**Unit Reading**:
A Reading whose Lemma family is Lexeme, Locution, Saying, or Morpheme. The
grouping adds no identity.

**Reading Note**:
The learner-facing Note for one Unit Reading, combining its Knowledge, Lemma,
and source Occurrence Attestations.

**Personal Annotation**:
A Visitor-specific freeform text about one exact Reading. It is presented with
a Reading Note but remains separate from the Reading's shared Knowledge.
_Avoid_: User Note, Knowledge Note

**Source Context**:
A projection of one Occurrence Attestation inside its source Sentence, from a
Visitor-submitted Text or a Definition Text. It adds no linguistic identity.
A Reading Note shows only those the current Visitor has encountered. See
[tf-demo ADR 0004] and [tf-demo ADR 0005].
_Avoid_: clicked context, Reading identity evidence

**Definition Text**:
The hidden Text that holds one Reading's Knowledge definition as a single
Sentence so its Segments can be selected. It is never listed in the Library.
See [tf-demo ADR 0005].
_Avoid_: definition sentence row, synthetic text

**Definition Focus**:
The part of a Reading Note target that lands on the Definition block and
lights the members of one occurrence inside it. It is presentation state and
adds no identity. See [tf-demo ADR 0005].

**Lemma Note**:
A projection of one Lemma and its Readings. A VERB's Lemma Note also lists the
Readings that name it as their Participle Source. It adds no identity beyond
the Lemma and Reading records it presents. See [ADR 0036].

**Surface Note**:
A projection of one normalized orthographic form in one language, aggregating
its typed Lemma analyses without assigning the Note an outer Family or Kind. A
German noun's header shows its article so the learner remembers the gender.
See [ADR 0040].

**Crossroad Note**:
A projection of one Spelling Crossroad: every Reading whose Lemma's Canonical
Form has that spelling, across Families and Kinds. It adds no identity. The
Surface Note answers what a clicked form can be; the Crossroad Note answers
which words are spelled this way.

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
A stable anonymous interaction identity that owns Visitor Encounter history
and Personal Annotations. See [tf-demo ADR 0002].
_Avoid_: Learner, User, account

**Segment Selection**:
An ephemeral Visitor command that presents a stored route or starts one
Resolution Session. See [tf-demo ADR 0002].
_Avoid_: Click record, Resolution

**Segment Resolution State**:
The shared current outcome for an unattested Segment. A Visitor sees it only
after encountering that Segment, and committed Attestation Membership
replaces it. See [tf-demo ADR 0004].
_Avoid_: Visitor status, Attestation state

**Resolution Step Note**:
A transient projection reached by one Resolution Session. After commit it
converges to the canonical Note subject.

**Visitor Encounter**:
The single durable association of one Visitor with one Segment after its first
selection. An occurrence is encountered when any of its member Segments was.
See [tf-demo ADR 0002] and [tf-demo ADR 0004].

**Membership Conflict**:
A rejected occurrence proposal that overlaps a committed Occurrence
Attestation without matching all and only its members. See
[tf-demo ADR 0001].

**Analysis Stripping**:
Removal of derived analysis for the Texts in scope while preserving those
Texts and their Sentences. Apart from full reset, it is the only operation
that ends Occurrence Attestations. See [tf-demo ADR 0001] and
[tf-demo ADR 0005].

[ADR 0019]: ../../docs/adr/0019-select-grammatical-alternatives-from-reviewed-members.md
[ADR 0034]: ../../docs/adr/0034-store-valency-as-e-valbu-frames-on-the-reading.md
[ADR 0035]: ../../docs/adr/0035-attest-articles-and-fused-words-segment-by-segment.md
[ADR 0036]: ../../docs/adr/0036-make-adjectival-german-participles-adj-linked-to-their-verb.md
[ADR 0040]: ../../docs/adr/0040-make-the-article-a-satellite-of-its-phrase-head.md
[Dumgen ADR 0004]: ../../battery/dumgen/docs/adr/0004-make-segment-the-one-clickable-dto-produced-at-intake.md
[Dumgen ADR 0006]: ../../battery/dumgen/docs/adr/0006-segment-in-two-layers-lexeme-targets-and-phraseme-targets.md
[Dumgen ADR 0007]: ../../battery/dumgen/docs/adr/0007-segment-text-into-biggest-units-and-break-multiword-lemmas-down-apart.md
[tf-demo ADR 0001]: ./docs/adr/0001-persist-occurrence-attestations-by-segment-membership.md
[tf-demo ADR 0002]: ./docs/adr/0002-persist-one-visitor-encounter-per-segment.md
[tf-demo ADR 0003]: ./docs/adr/0003-make-the-workspace-own-navigation.md
[tf-demo ADR 0004]: ./docs/adr/0004-share-segment-resolution-state-behind-visitor-encounters.md
[tf-demo ADR 0005]: ./docs/adr/0005-materialize-definitions-as-hidden-definition-texts.md
[tf-demo ADR 0006]: ./docs/adr/0006-render-a-note-presentation-as-one-element-of-blocks.md
