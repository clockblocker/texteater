# Dumgen

Dumgen produces linguistic Units and Knowledge for supplied encounters.

## Language

**Segment**:
the one clickable piece of a Segmented Sentence: its character offset in the
Stitched Text, its kind, the text it shows, and the surface it stands for. For
most words surface equals text; a fused word yields one Segment per component
(`ins` is `in`, `s` standing for `das`), and an abbreviation is one Segment
whose surface is its expansion. Segments concatenated give the Stitched Text
back. The offset is the persisted occurrence coordinate.
_Avoid_: Piece, token, Segment index as identity

**Segmented Sentence**:
one Sentence as intake leaves it: language, Stitched Text and Segments.
_Avoid_: Sentence DTO

**`Segment.Text`**:
the segmenter that routes clicks. It takes a text and returns its Segments and
its biggest units, each the Segments that route to one unit with its route
(language, Family, Kind) or `Unresolved`. Every Segment belongs to exactly one
unit.
_Avoid_: lattice, Sentence Analysis, for the current design

**`Segment.Unit`**:
the segmenter that breaks one Locution or Saying down into its Lexemes, once
per Lemma. It returns the same shape as `Segment.Text` one level down and
never the whole Lemma as one unit.
_Avoid_: Lexical Breakdown, inner layer

**Encounter**:
a Segmented Sentence together with one Analysis Target supplied
for linguistic resolution or Knowledge production.

**Analysis Target**:
the unit an Encounter resolves: its route and ordered Segment members, as
segmentation chose them. A click resolves it and never classifies it.
_Avoid_: Unit, group, lattice node

**Realized Slot**:
a preposition slot the sentence realizes, linked to the unit that lexically
selects the preposition. Its marker is the Segment realizing the preposition
(a preposition or a fused word's adposition); a pronominal adverb realizes
the preposition and its filler at once, so it stays its own unit and is the
slot's filler instead. The complement names the preposition's Lemma, its case
and its referent. The governor is the smallest unit the government survives
with in the same sense: `Angst vor` belongs to `Angst`, also inside `Angst
haben`, while `Bescheid wissen über` belongs to the Locution, since
`Bescheid` alone is an official notice. Intake records only preposition
slots; bare-case slots come from the Knowledge call's frame.
_Avoid_: government list, valency guess, governed-preposition prompt

**Grammatical Resolution**:
production of a click-independent Attestation for an Analysis Target whose
route is already chosen.

**Referent Context**:
the Sentences just before and after an Encounter's Sentence in its Text.
Grammatical Resolution reads them only for a pronoun form that several cells
share and that only its referent decides: accusative `sie` is her or them,
`ihm` belongs to `er` or `es`. Given the Sentence alone while neighbours
exist, resolution may answer More Context Required. With the neighbours, or
with none to give, it always picks a cell.
_Avoid_: surrounding text, paragraph context

**Authored Content**:
reviewed Lemmas, fixed Readings, Knowledge and semantic
relation claims that Dumgen selects under its production policy. Dumspec's
Authored Inventories hold the closed-class members; Dumgen reads them.

**Fixed Catalog**:
the reviewed Authored Content that bounds a Closed Route. Its members are
authored in Dumspec; Dumgen decides the closure.

**Fixed Population**:
reviewed Authored Content within an Open Route. An occurrence that matches no
member continues through generation; a matched member missing required
content is a Catalog Miss.

**Closed Route**:
a production route that resolves only within its Fixed Catalog. The German
Closed Routes are Lexeme AUX and DET.

**Catalog Miss**:
absence of a required authored value on a Closed Route or for an exact authored
Reading in a Fixed Population.

**Grammatical Navigation**:
selection of reviewed members by preserving fixed
Core Features and varying explicitly named coordinates.

**Knowledge Production**:
proposed Knowledge changes and Pending Semantic
Relations for a caller-supplied Reading in an Encounter.

**Evaluation Run**:
one recorded execution of a linguistic experiment, with
its effective model settings, case outputs, failures and evaluation results.

### Legacy intake

These terms name the intake Dumgen still ships, from Dumgen ADRs 0005 and 0006.
Dumgen ADR 0007 supersedes both, and the segmentation rewrite (#701) removes
these terms with the code. The legacy intake still names Phraseme Kinds, which
ADR 0039 replaced with Locution and Saying.

**Sentence Analysis**:
what the legacy intake stores beside one German Segmented Sentence: its
offset-keyed Segments with surfaces, its Lexeme Targets, its Phraseme Targets,
and its Fusions. Produced by `analyzeSentence` and read at selection time.
_Avoid_: precomputed resolution

**Lexeme Target**:
the Segments that realize one Lexeme occurrence: its Members with roles,
exactly one Head, one Route Mass over Lexeme Kinds, and, when the head is
closed-class, its Identity Candidates. `zur` is two: the ADP `zu` and the
Article `r` of the noun that follows.
_Avoid_: word, token group

**Phraseme Target**:
the Lexeme Targets that are fixed lexical members of one expression, with a
Kind Mass and a fixedness. It also lists a preposition the expression governs
when no one of its words governs it alone (`über` in `weiß Bescheid über`),
which never counts toward its fixedness.
_Avoid_: nested target, idiom group

**Kind Mass**:
a Phraseme Target's distribution over Phraseme Kinds, `None` and Unresolved.
The fixedness score establishes the expression; the Kind Mass names it.

**Fixedness**:
the score of a word inside the wording around it: free combination, preferred
combination, collocation, fixed expression. Only a word at or above the floor
is a member of a Phraseme Target.
_Avoid_: confidence, idiomaticity

**Member**:
one Segment inside a Lexeme Target with its Member Role: Head,
SeparableParticle, GovernedPreposition, Reflexive, Expletive, Article,
Auxiliary, DegreeMarker, or Unresolved. Roles stay inside the legacy intake;
no Attestation records them (ADR 0041).
_Avoid_: role mass, Free member

**Route Mass**:
a Lexeme Target's distribution over Lexeme Kinds, including Unresolved. The
legacy intake derives the Family from the Kind, which ADR 0039 no longer
allows: a Kind name may repeat across Families.
_Avoid_: route, classification

**Identity Candidates**:
a Lexeme Target's distribution over the authored members its closed-class
head can realize, plus NoMatch and Unresolved. The winning candidate implies
the route.
_Avoid_: headword, per-member identity

**Identity State**:
what the Resolution Selector says about a Member: Selected (the head has a
winning candidate), Derived (a non-head role whose identity follows from the
target's shape and grammar), Open (no candidates; generation continues), or
Miss (a DET or PRON route whose head's spelling enumerates no candidate).

**Resolution Selector**:
the pure function that turns a Sentence Analysis's masses into resolved
values: the Unresolved floor, identity implies route, Identity State from
role and candidates, and the largest unit at an offset.
_Avoid_: stored resolution, threshold migration
