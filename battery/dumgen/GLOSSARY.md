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
A Text as `segment.inUnits` returns it: its paragraphs, each with its
Segmented Sentences in order.

**Stitched Text**:
One Sentence's text once code has normalized its mechanical whitespace. Its
Segments concatenated give it back. See [Dumgen ADR 0004].
_Avoid_: stitching question, repaired text

**`splitText`**:
The code that splits a Text into paragraphs and Sentences before
`segment.inUnits` sees it. See [Dumgen ADR 0007].

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

**`segment.inLexemes`**:
The segmenter that breaks one Locution or Saying down into its Lexemes, once
per Lemma. See [Dumgen ADR 0007].
_Avoid_: Segment.Unit, Lexical Breakdown, inner layer

**`segment.inMorphemes`**:
The segmenter that would break a Lexeme down into its Morphemes. See
[Dumgen ADR 0007].

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
first. See [Dumgen ADR 0007].

**`valencyEvidence`**:
The Case and Preposition complements one occurrence realizes, recorded on its
Attestation. Grammatical Resolution writes it and Knowledge Production reads
it. See [ADR 0034] and [Dumgen ADR 0007].
_Avoid_: Realized Slot, intake slots, government list, valency guess,
governed-preposition prompt

**Referent Context**:
The Sentences just before and after an Encounter's Sentence in its Text,
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
Proposed Knowledge changes and Pending Semantic Relations for a
caller-supplied Reading in an Encounter. See [Dumgen ADR 0003].

**Evaluation Run**:
One recorded execution of a linguistic experiment, with its effective model
settings, case outputs, failures and evaluation results.

[ADR 0021]: ../../docs/adr/0021-close-routes-in-dumgen-and-author-closed-class-inventories-in-dumcorpus.md
[ADR 0034]: ../../docs/adr/0034-store-valency-as-e-valbu-frames-on-the-reading.md
[ADR 0044]: ../../docs/adr/0044-identify-german-pronouns-by-pillar-stem-and-referent.md
[ADR 0046]: ../../docs/adr/0046-generate-a-syncretism-for-each-form-only-its-referent-resolves.md
[Dumgen ADR 0003]: ./docs/adr/0003-split-german-knowledge-generation-by-family.md
[Dumgen ADR 0004]: ./docs/adr/0004-make-segment-the-one-clickable-dto-produced-at-intake.md
[Dumgen ADR 0007]: ./docs/adr/0007-segment-text-into-biggest-units-and-break-multiword-lemmas-down-apart.md
[Dumgen ADR 0008]: ./docs/adr/0008-judge-segment-in-units-by-membership-before-route.md
