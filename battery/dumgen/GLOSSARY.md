# Dumgen

Dumgen produces linguistic Units and Knowledge for supplied encounters. Each
entry links the ADRs that hold the term's precise definition, edge cases and
examples.

## Language

**Segment**:
The one clickable piece of a Segmented Sentence. Its index among its
Sentence's Segments is the persisted occurrence coordinate. See
[Dumgen ADR 0004].
_Avoid_: Piece, token, character offset as identity

**Segmented Sentence**:
One Sentence as intake leaves it: its Stitched Text, its Segments and its
units from `segment.inUnits`.
_Avoid_: Sentence DTO

**Segmented Text**:
The segmentation `segment.inUnits` returns for one text, in tf-demo one
Scroll: its paragraphs, each with its Segmented Sentences in order.

**Stitched Text**:
One Sentence's text once code has normalized its mechanical whitespace. Its
Segments concatenated give it back. See [Dumgen ADR 0004].
_Avoid_: stitching question, repaired text

**`splitText`**:
The code that splits raw text into paragraphs and Sentences before
`language.detect` and `segment.inUnits` see it. It is language-neutral,
since it runs before any language is known. See [Dumgen ADR 0007].

**`language.detect`**:
The judge that gives each Sentence its Detected Language before
`segment.inUnits`, so only target-language Sentences are segmented. See
[Dumgen ADR 0001].

**`segment.inUnits`**:
The segmenter that routes clicks: it groups each Sentence's Segments into
biggest units, each with its route or `Unresolved`. See [Dumgen ADR 0007]
and [Dumgen ADR 0008].
_Avoid_: Segment.Text, lattice, Sentence Analysis, for the current design

**Membership**:
Which Segments `segment.inUnits` puts in one unit, whatever its route. See
[Dumgen ADR 0008].

**Route Variant**:
One of the few routes a borderline unit carries when `segment.inUnits`
cannot decide between the Kinds of one known clash set. At click time, that
clash set's focused prompt picks one. See [Dumgen ADR 0007] and
[Dumgen ADR 0008].
_Avoid_: route distribution, alternative route

**`segment.inConstituents`**:
The segmenter that produces a Reading's Constituents (Dumling), once per
Reading: a word's immediate parts, or a phraseme's words, each a Lexeme.
The host runs it only on a Reading with no Source (Dumrel), so a word it
finds none for is a bottom word. See [Dumgen ADR
0007] and [ADR 0050].
_Avoid_: `segment.inLexemes`, Segment.Unit, Lexical Breakdown, inner layer

**`segment.inMorphemes`**:
The segmenter that splits a bottom word, one with no word inside, into its
Morphemic Breakdown (Dumling): a word with no Source (Dumrel) that
`segment.inConstituents` finds no Constituents for. Every other word's is
propagated in code. See [Dumgen ADR 0007] and [ADR 0051].

**Encounter**:
A Segmented Sentence together with one Analysis Target supplied for
linguistic resolution or Knowledge production.

**Analysis Target**:
The unit an Encounter resolves: its ordered Segment members and its route,
with any Route Variants, as segmentation chose them. See [Dumgen ADR 0007].
_Avoid_: Unit, group, lattice node

**Grammatical Resolution**:
Production of a click-independent Attestation for an Analysis Target. It
keeps the route segmentation chose, and settles a target's Route Variants
first. A German Surface it writes is a Base-Order Form (Dumling), with no
Valency Frame in sight. See [Dumgen ADR 0007] and [ADR 0056].

**`valencyEvidence`**:
The Case, Preposition and Reflexive complements one occurrence realizes,
recorded on its Attestation. A Reflexive names its case only where the
occurrence shows it, by its form or its fixed phrase's preposition; otherwise
the Reading's frame holds the case. A pronominal adverb that realizes a
Locution's fixed preposition is the member a Preposition names; a free one
leaves the member empty. Grammatical Resolution writes it and Knowledge
Production reads it. See [ADR 0034], [ADR 0052], [ADR 0056] and
[Dumgen ADR 0007].
_Avoid_: Realized Slot, intake slots, government list, valency guess,
governed-preposition prompt

**Referent Context**:
The Sentences just before and after an Encounter's Sentence in its text,
which Grammatical Resolution reads to settle a pronoun's referent. See
[ADR 0044] and [ADR 0046].
_Avoid_: surrounding text, paragraph context

**Fixed Catalog**:
The Authored Inventory (Dumcorpus) members that bound a Closed Route. See
[ADR 0021].

**Fixed Population**:
The Authored Inventory (Dumcorpus) members on an Open Route. See [ADR 0021].

**Closed Route**:
A production route that resolves only within its Fixed Catalog. See
[ADR 0021].

**Catalog Miss**:
Absence of a required authored value on a Closed Route, or for an
Authored Inventory member matched in a Fixed Population. See [ADR 0021].

**Knowledge Production**:
Proposed Knowledge changes, Paradigm Changes (Dumrel) and Pending Semantic
Relations for a caller-supplied Reading in an Encounter. See
[Dumgen ADR 0003] and [ADR 0048].

**Licence Judge**:
The jev judge Knowledge Production asks for a Lemma's later Reading, after
Luna has written its forms: for each Variation Dimension where those forms
differ from the stored Paradigm Variants (Dumrel), which of the stored and
new forms, shown together and unattributed, its sense takes. It never routes
a click; the Reading judge ignores the Paradigm. See [ADR 0048] and
[Dumgen ADR 0003].
_Avoid_: paradigm judge, variant matcher

**`knowledge.accumulateTranslations`**:
The step that adds to a Reading's stored translations the ones a later
occurrence needs: jev judges whether a stored one covers the occurrence, and
only after NoMatch does Luna write the occurrence's equivalents. See
[ADR 0047].

**`translate.sentence`**:
The writer that translates one Sentence into a Dumrel translation language,
reading the Sentences around it as context only. It translates the whole
Sentence and stores nothing, unlike Knowledge Production's `translations`,
a Reading's dictionary equivalents.
_Avoid_: Sentence Knowledge, translations aspect, for a Sentence's translation

**Evaluation Run**:
One recorded execution of a linguistic experiment, with its effective model
settings, case outputs, failures and evaluation results.

[ADR 0021]: ../../docs/adr/0021-close-routes-in-dumgen-and-author-closed-class-inventories-in-dumcorpus.md
[ADR 0034]: ../../docs/adr/0034-store-valency-as-e-valbu-frames-on-the-reading.md
[ADR 0044]: ../../docs/adr/0044-identify-german-pronouns-by-pillar-stem-and-referent.md
[ADR 0046]: ../../docs/adr/0046-generate-a-syncretism-for-each-form-only-its-referent-resolves.md
[ADR 0047]: ../../docs/adr/0047-accumulate-a-readings-translations-click-by-click.md
[ADR 0048]: ../../docs/adr/0048-keep-paradigm-variants-on-the-lemma-and-license-them-per-reading.md
[ADR 0050]: ../../docs/adr/0050-break-a-reading-down-into-its-constituents.md
[ADR 0051]: ../../docs/adr/0051-copy-school-morphemic-analysis-into-a-readings-morphemes.md
[ADR 0052]: ../../docs/adr/0052-record-a-lexical-reflexive-on-the-reading-never-in-the-canonical-form.md
[ADR 0056]: ../../docs/adr/0056-store-a-german-surface-in-base-order-and-project-its-slots.md
[Dumgen ADR 0001]: ./docs/adr/0001-judge-each-sentence-before-conditional-stitching-and-local-segmentation.md
[Dumgen ADR 0003]: ./docs/adr/0003-split-german-knowledge-generation-by-family.md
[Dumgen ADR 0004]: ./docs/adr/0004-make-segment-the-one-clickable-dto-produced-at-intake.md
[Dumgen ADR 0007]: ./docs/adr/0007-segment-text-into-biggest-units-and-break-multiword-lemmas-down-apart.md
[Dumgen ADR 0008]: ./docs/adr/0008-judge-segment-in-units-by-membership-before-route.md
