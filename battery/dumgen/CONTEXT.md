# Dumgen

Dumgen produces linguistic Units and Knowledge for supplied encounters. Each
entry links the ADRs that hold the term's precise definition, edge cases and
examples.

## Language

**Segment**:
The one clickable piece of a Segmented Sentence. A fused word yields one
Segment per component, and a Segment's index among its Sentence's Segments
is the persisted occurrence coordinate. See [Dumgen ADR 0004].
_Avoid_: Piece, token, character offset as identity

**Segmented Sentence**:
One Sentence as intake leaves it: its Stitched Text, its Segments and its
units from `segment.inUnits`. A Sentence whose segmentation failed is
marked failed and has no units.
_Avoid_: Sentence DTO

**Segmented Text**:
A Text as `segment.inUnits` returns it: its paragraphs, each with its
Segmented Sentences in order.

**Stitched Text**:
One Sentence's text once code has normalized its mechanical whitespace:
trimmed, with every run of spaces, tabs or other non-line-break whitespace
turned into one ASCII space. Line breaks stay as written. Its Segments
concatenated give it back. No judge sees whitespace (#689).
_Avoid_: stitching question, repaired text

**`splitText`**:
The code that splits a Text into paragraphs and Sentences before
`segment.inUnits` sees it. No judge takes part. See [Dumgen ADR 0007].

**`segment.inUnits`**:
The segmenter that routes clicks. It takes a text already split into
Sentences and groups each Sentence's Segments into biggest units, each with
its route or `Unresolved`. Its jev-based judges see one Sentence at a time.
When their calls fail for a Sentence, that Sentence comes back marked
failed, with its Segments and no units, and the others are kept. See
[Dumgen ADR 0007] and [Dumgen ADR 0008].
_Avoid_: Segment.Text, lattice, Sentence Analysis, for the current design

**Membership**:
Which Segments `segment.inUnits` puts in one unit, whatever its route. It
is judged before the route: a unit is right when its Segment set matches
gold. See [Dumgen ADR 0008].

**Route Variant**:
One of the few routes a borderline unit carries when `segment.inUnits`
cannot decide between them, its route first. A click picks one and never
regroups the unit. See [Dumgen ADR 0007] and [Dumgen ADR 0008].
_Avoid_: route distribution, alternative route

**`segment.inLexemes`**:
The segmenter that breaks one Locution or Saying down into its Lexemes, once
per Lemma. It returns the same shape as `segment.inUnits` one level down and
is deferred for now. See [Dumgen ADR 0007].
_Avoid_: Segment.Unit, Lexical Breakdown, inner layer

**`segment.inMorphemes`**:
The segmenter that would break a Lexeme down into its Morphemes. It is named
to complete the set and is out of scope for now. See [Dumgen ADR 0007].

**Encounter**:
A Segmented Sentence together with one Analysis Target supplied for
linguistic resolution or Knowledge production.

**Analysis Target**:
The unit an Encounter resolves: its ordered Segment members and its route, as
segmentation chose them. Where segmentation left a few route variants, a click
picks one of them; it never regroups the members or weighs a route outside the
variants. See [Dumgen ADR 0007].
_Avoid_: Unit, group, lattice node

**Grammatical Resolution**:
Production of a click-independent Attestation for an Analysis Target whose
route is already chosen.

**`valencyEvidence`**:
The Case and Preposition complements one occurrence realizes, recorded on its
Attestation, each with the member that realizes it, if any, and the case it
shows. Grammatical Resolution writes it in the grammar judgment a click
already runs, and Knowledge Production reads it. `segment.inUnits` only
decides whether a governed preposition joins its governor. See [ADR 0034]
and [Dumgen ADR 0007].
_Avoid_: Realized Slot, intake slots, government list, valency guess,
governed-preposition prompt

**Referent Context**:
The Sentences just before and after an Encounter's Sentence in its Text.
Grammatical Resolution reads them only for a pronoun form whose cell its
referent decides, and attests the form's Syncretism (Dumling) when they leave
the referent open. See [ADR 0044] and [ADR 0046].
_Avoid_: surrounding text, paragraph context

**Authored Content**:
Reviewed Lemmas, fixed Readings, Knowledge and semantic relation claims that
resolution returns instead of generating them. Dumspec's Authored Inventories
hold the closed-class members and the selectors that find them; Dumgen judges
only between the members a selector leaves. See [ADR 0021].

**Fixed Catalog**:
The reviewed Authored Content that bounds a Closed Route. Its members and
which routes are Closed are authored in Dumspec, and Dumgen enforces the
closure by returning a Catalog Miss. See [ADR 0021].

**Fixed Population**:
Reviewed Authored Content within an Open Route. See [ADR 0021].

**Closed Route**:
A production route that resolves only within its Fixed Catalog. See
[ADR 0021].

**Catalog Miss**:
Absence of a required authored value on a Closed Route or for an exact
authored Reading in a Fixed Population. See [ADR 0021].

**Knowledge Production**:
Proposed Knowledge changes and Pending Semantic Relations for a
caller-supplied Reading in an Encounter. See [Dumgen ADR 0003].

**Evaluation Run**:
One recorded execution of a linguistic experiment, with its effective model
settings, case outputs, failures and evaluation results.

[ADR 0021]: ../../docs/adr/0021-close-routes-in-dumgen-and-author-closed-class-inventories-in-dumspec.md
[ADR 0034]: ../../docs/adr/0034-store-valency-as-e-valbu-frames-on-the-reading.md
[ADR 0044]: ../../docs/adr/0044-identify-german-pronouns-by-pillar-stem-and-referent.md
[ADR 0046]: ../../docs/adr/0046-generate-a-syncretism-for-each-form-only-its-referent-resolves.md
[Dumgen ADR 0003]: ./docs/adr/0003-split-german-knowledge-generation-by-family.md
[Dumgen ADR 0004]: ./docs/adr/0004-make-segment-the-one-clickable-dto-produced-at-intake.md
[Dumgen ADR 0007]: ./docs/adr/0007-segment-text-into-biggest-units-and-break-multiword-lemmas-down-apart.md
[Dumgen ADR 0008]: ./docs/adr/0008-judge-segment-in-units-by-membership-before-route.md
