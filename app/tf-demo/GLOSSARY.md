# tf-demo

tf-demo presents one shared linguistic graph and demo dictionary. Anonymous
Visitors contribute encounter history but do not partition linguistic identity
or Knowledge. Each entry links the ADRs that hold the term's precise
definition, edge cases and examples. The [Compass glossary] defines the
workspace terms, such as Pane, Sheet, Card and Deck.

## Language

**Learner**:
The person tf-demo serves: reads Texts, owns a Library and Submissions. A
Learner is known only through a Visitor until accounts exist.
_Avoid_: User, Reader, Visitor (the anonymous identity, not the person)

**Library**:
The Menu Item listing Texts. See [tf-demo ADR 0008].
_Avoid_: Library Sheet, Text Sheet

**Settings**:
The Menu Item beside the Library that holds the application's settings. See
[tf-demo ADR 0003].

**Shelf**:
A curated collection of Texts that a person has checked. Its Texts go
through the same Intake as Learner uploads.

**Price**:
The coins a Submission costs, shown before Intake starts.
_Avoid_: quote

**Mode**:
One way to read a Text. A Text offers the Modes its Medium allows, and the
Learner can switch between them.
_Avoid_: View

**Page Mode**:
The Mode that shows Page Images with clickable Segments over them. It suits
visual material: comics, picture books, worksheets.

**Reflow Mode**:
The Mode that sets a Text in tf-demo's own reader. Every Text offers it. It
suits books, newspapers, articles and sparsely illustrated books.

**Playback Mode**:
The Mode that shows a recording's transcript while it plays, with the current
Sentence highlighted. Tapping a Segment pauses and looks it up; tapping a
Sentence replays it.
_Avoid_: transcript view, transcription

**Flag**:
A Learner's report that one spot in a Text is wrong. Re-running a Sentence
replaces its Segments, so the fix strips that Sentence's Occurrence
Attestations. See [Dumgen ADR 0004].

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

**Caption**:
The words a Heading Block shows after its title, saying how the Note's
Subject leads to the next Card dealt in front of it in a click's Deck:
`ging · past of` in the pile, above that Card's tail, and
`ging · past of gehen` as a Sheet. See [tf-demo ADR 0011].
_Avoid_: aside, subtitle

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
_Avoid_: User, account

**Segment Selection**:
An ephemeral Visitor command that presents a stored route or starts one
Resolution Session. See [tf-demo ADR 0002].
_Avoid_: Resolution

**Segment Resolution State**:
The shared current outcome for an unattested Segment. See [tf-demo ADR 0004].
_Avoid_: Visitor status, Attestation state

**Resolution Step Note**:
A transient projection reached by one Resolution Session. After commit it
converges to the canonical Note subject.

**Visitor Encounter**:
The single durable association of one Visitor with one Segment after its first
selection. See [tf-demo ADR 0002] and [tf-demo ADR 0004].
_Avoid_: Click record, visitor click

**Membership Conflict**:
A rejected occurrence proposal that overlaps a committed Occurrence
Attestation without matching all and only its members. See
[tf-demo ADR 0001].

**Analysis Stripping**:
Removal of derived analysis for the Texts in scope while preserving those
Texts and their Sentences. See [tf-demo ADR 0001] and [tf-demo ADR 0005].

### Intake

These terms name what Intake takes in, keeps and produces. tf-demo runs
Intake; Dumgen's `splitText` and `segment.inUnits` are its last steps.

**Submission**:
What a Learner or curator hands in to become a Text: pasted text, a file or
a link.
_Avoid_: upload (as a noun), import, Text Record

**Original**:
The submitted material as Intake keeps it: the file, its Page Images or its
recording.
_Avoid_: source

**Medium**:
What an Original is made of: text, pages or a recording. It decides which
Modes a Text offers.
_Avoid_: Kind, type, format

**Intake**:
The one pipeline that turns a Submission into a Text, the same for Shelves
and Learner uploads. It works Chapter by Chapter: Extraction, then
`splitText` and `segment.inUnits`.
_Avoid_: ingestion, processing, import

**Extraction**:
The Intake step that reads the words and their structure out of an Original.
It produces an Extracted Text.
_Avoid_: transcription, OCR as the general term

**Extracted Text**:
The stored form every Extraction produces: Chapters of Headings and
Paragraphs, with Line Breaks, Inline Styles and Original Locations, as running
text not yet split into Sentences. Pasted text is the simplest one: one
Chapter, no Original Locations. Intake keeps it so a Flag, a segmentation
improvement or a curator's fix re-runs only the cheap steps.

**Text**:
The readable result of Intake, listed in the Library: Chapters of Sentences,
each cut into Segments.

**Chapter**:
The piece of a Text that Intake processes and a Learner opens as a whole. An
article is one Chapter. Each Chapter becomes ready on its own.
_Avoid_: Part, Section, batch

**Heading**:
A title in a Text, the Chapter's own or one inside it. A Heading Block
belongs to a Note instead.

**Paragraph**:
A stretch of running text the Original sets apart. In a Text it holds
Sentences.
_Avoid_: Block

**Line Break**:
A break inside a Paragraph that Intake keeps because it carries meaning, as
in verse, lyrics and letters.

**Sentence**:
The unit of reading and of language detection. A Segment is located by its
Sentence and its index there. See [Dumgen ADR 0004].

**Inline Style**:
Italic, bold or quotation on a run of text, kept from the Original.
_Avoid_: formatting, markup

**Detected Language**:
The language Intake detects for one Sentence. A foreign word inside a
target-language Sentence stays clickable as Foreign (Dumling). See
[Dumgen ADR 0001] and [ADR 0045].

**Plain Sentence**:
A Sentence whose Detected Language is not the target language. It is shown
but not clickable.

**Original Location**:
Where a piece of an Extracted Text sits in its Original: an area of a Page
Image, a time span of a recording, or a spot in the file.
_Avoid_: anchor, offset

**Page Image**:
One page of an Original whose Medium is pages.
_Avoid_: Page, scan

**Page Region**:
An area of a Page Image that holds text: a speech balloon, a caption box, a
label.
_Avoid_: bubble, Caption, Region

[ADR 0019]: ../../docs/adr/0019-select-grammatical-alternatives-from-reviewed-members.md
[ADR 0034]: ../../docs/adr/0034-store-valency-as-e-valbu-frames-on-the-reading.md
[ADR 0035]: ../../docs/adr/0035-attest-articles-and-fused-words-segment-by-segment.md
[ADR 0036]: ../../docs/adr/0036-make-adjectival-german-participles-adj-linked-to-their-verb.md
[ADR 0040]: ../../docs/adr/0040-make-the-article-a-satellite-of-its-phrase-head.md
[ADR 0045]: ../../docs/adr/0045-give-foreign-material-a-foreign-family-and-retire-lexeme-x.md
[Dumgen ADR 0001]: ../../battery/dumgen/docs/adr/0001-judge-each-sentence-before-conditional-stitching-and-local-segmentation.md
[Dumgen ADR 0004]: ../../battery/dumgen/docs/adr/0004-make-segment-the-one-clickable-dto-produced-at-intake.md
[Dumgen ADR 0007]: ../../battery/dumgen/docs/adr/0007-segment-text-into-biggest-units-and-break-multiword-lemmas-down-apart.md
[tf-demo ADR 0001]: ./docs/adr/0001-persist-occurrence-attestations-by-segment-membership.md
[tf-demo ADR 0002]: ./docs/adr/0002-persist-one-visitor-encounter-per-segment.md
[tf-demo ADR 0003]: ./docs/adr/0003-make-the-workspace-own-navigation.md
[tf-demo ADR 0004]: ./docs/adr/0004-share-segment-resolution-state-behind-visitor-encounters.md
[tf-demo ADR 0005]: ./docs/adr/0005-materialize-definitions-as-hidden-definition-texts.md
[tf-demo ADR 0006]: ./docs/adr/0006-render-a-note-presentation-as-one-element-of-blocks.md
[tf-demo ADR 0008]: ./docs/adr/0008-give-every-pane-a-ground-beneath-its-covers.md
[tf-demo ADR 0011]: ./docs/adr/0011-tell-a-clicks-story-in-its-deck.md
[Compass glossary]: ../../battery/compass/GLOSSARY.md
