# tf-demo

tf-demo presents one shared linguistic graph and demo dictionary. Anonymous
Visitors contribute encounter history but do not partition linguistic identity
or Knowledge. Each entry links the ADRs that hold the term's precise
definition, edge cases and examples. The [Compass glossary] defines the
workspace terms, such as Pane, Sheet, Card and Deck.

## Language

**Library**:
The Menu Item listing Texts. See [tf-demo ADR 0008].
_Avoid_: Library Sheet, Text Sheet

**Settings**:
The Menu Item beside the Library that holds the application's settings. See
[tf-demo ADR 0003].

**Link**:
A reference inside a Note naming one Note, or a location in a Text as Go to
source does. See [tf-demo ADR 0008].

**Note Presentation**:
A Subject such as a Reading, a Surface or a Resolution Step, presented as a
Note in Card or Sheet form. See [tf-demo ADR 0006].

**Block**:
One ordered member of a Note's content. See [tf-demo ADR 0006].

**Heading Block**:
The pinned first Block naming the Note's Subject. See [tf-demo ADR 0006].

**Source Contexts Block**:
The pinned Block listing where the Subject was met. See [tf-demo ADR 0006].

**Valency Block**:
The Block showing a Reading's Lemma with its Valency Frame. See [ADR 0034].

**Fusion Block**:
The Attestation Note Block for a fused word that the Attestation holds a piece
of: the fused word and the words it stands for. See [ADR 0035].

**Anchor Blocks**:
The Heading and Source Contexts, which stay visible across every form. See
[tf-demo ADR 0006].
_Avoid_: header, card tail content

**Workspace Persistence**:
The workspace state that survives a reload. See [tf-demo ADR 0003].

**Occurrence Attestation**:
tf-demo's durable record for one resolved high-level occurrence in one
Sentence. See [tf-demo ADR 0001].

**Attestation Membership**:
The exclusive link from one Segment, named by its index in its Sentence, to
at most one Occurrence Attestation. See [tf-demo ADR 0001], [ADR 0035] and
[Dumgen ADR 0004].

**Stored Segment**:
One Segment of a stored Sentence, as intake's `segment.inUnits` cut it. See
[ADR 0035] and [Dumgen ADR 0004].
_Avoid_: token, word

**Stored Unit**:
One biggest unit intake stores with its Sentence. It is a hint for selection
and resolution, not linguistic identity. See [Dumgen ADR 0007].
_Avoid_: Sentence Analysis, precomputed resolution, Unit map

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
reviewed member. See [ADR 0019].

**Unit Reading**:
A Reading whose Lemma family is Lexeme, Locution, Saying, or Morpheme. The
grouping adds no identity.

**Reading Note**:
The learner-facing Note for one Unit Reading, combining its Knowledge, Lemma,
and source Occurrence Attestations.

**Personal Annotation**:
A Visitor-specific freeform text about one exact Reading, kept separate from
the Reading's shared Knowledge.
_Avoid_: User Note, Knowledge Note

**Source Context**:
A projection of one Occurrence Attestation inside its source Sentence. It
adds no linguistic identity. See [tf-demo ADR 0004] and [tf-demo ADR 0005].
_Avoid_: clicked context, Reading identity evidence

**Definition Text**:
The hidden Text that holds one Reading's Knowledge definition as a single
Sentence so its Segments can be selected. See [tf-demo ADR 0005] and
[tf-demo ADR 0008].
_Avoid_: definition sentence row, synthetic text

**Lemma Note**:
A projection of one Lemma and its Readings. It adds no identity. See
[ADR 0036].

**Surface Note**:
A projection of one normalized orthographic form in one language, aggregating
its typed Lemma analyses without assigning the Note an outer Family or Kind.
See [ADR 0040].

**Crossroad Note**:
A projection of one Spelling Crossroad (Dumling): which words are spelled
this way, where the Surface Note answers what a clicked form can be. It adds
no identity.

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
The shared current outcome for an unattested Segment. See [tf-demo ADR 0004].
_Avoid_: Visitor status, Attestation state

**Resolution Step Note**:
A transient projection reached by one Resolution Session. After commit it
converges to the canonical Note subject.

**Visitor Encounter**:
The single durable association of one Visitor with one Segment after its first
selection. See [tf-demo ADR 0002] and [tf-demo ADR 0004].

**Membership Conflict**:
A rejected occurrence proposal that overlaps a committed Occurrence
Attestation without matching all and only its members. See
[tf-demo ADR 0001].

**Analysis Stripping**:
Removal of derived analysis for the Texts in scope while preserving those
Texts and their Sentences. See [tf-demo ADR 0001] and [tf-demo ADR 0005].

[ADR 0019]: ../../docs/adr/0019-select-grammatical-alternatives-from-reviewed-members.md
[ADR 0034]: ../../docs/adr/0034-store-valency-as-e-valbu-frames-on-the-reading.md
[ADR 0035]: ../../docs/adr/0035-attest-articles-and-fused-words-segment-by-segment.md
[ADR 0036]: ../../docs/adr/0036-make-adjectival-german-participles-adj-linked-to-their-verb.md
[ADR 0040]: ../../docs/adr/0040-make-the-article-a-satellite-of-its-phrase-head.md
[Dumgen ADR 0004]: ../../battery/dumgen/docs/adr/0004-make-segment-the-one-clickable-dto-produced-at-intake.md
[Dumgen ADR 0007]: ../../battery/dumgen/docs/adr/0007-segment-text-into-biggest-units-and-break-multiword-lemmas-down-apart.md
[tf-demo ADR 0001]: ./docs/adr/0001-persist-occurrence-attestations-by-segment-membership.md
[tf-demo ADR 0002]: ./docs/adr/0002-persist-one-visitor-encounter-per-segment.md
[tf-demo ADR 0003]: ./docs/adr/0003-make-the-workspace-own-navigation.md
[tf-demo ADR 0004]: ./docs/adr/0004-share-segment-resolution-state-behind-visitor-encounters.md
[tf-demo ADR 0005]: ./docs/adr/0005-materialize-definitions-as-hidden-definition-texts.md
[tf-demo ADR 0006]: ./docs/adr/0006-render-a-note-presentation-as-one-element-of-blocks.md
[tf-demo ADR 0008]: ./docs/adr/0008-give-every-pane-a-ground-beneath-its-covers.md
[Compass glossary]: ../../battery/compass/GLOSSARY.md
