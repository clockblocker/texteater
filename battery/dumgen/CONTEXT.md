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
one Sentence as intake leaves it: language, Stitched Text and Segments. Its
Sentence Analysis carries what intake decided about them.
_Avoid_: Sentence DTO

**Sentence Analysis**:
the intake-owned value beside one German Segmented Sentence: its offset-keyed
Segments with surfaces, its Lexeme Targets, its Phraseme Targets, and its
Fusions with each component pointing at a Segment. Produced by
`analyzeSentence`, stored by the host, read at selection time.
_Avoid_: lattice, precomputed resolution

**Encounter**:
a Segmented Sentence together with one Analysis Target supplied
for linguistic resolution or Knowledge production.

**Analysis Target**:
the unit an Encounter resolves: a Family, a Kind and the ordered Segment
members. At intake it is a Lexeme Target or a Phraseme Target; at click time
it is the largest unit containing the clicked Segment, or what
classification assembled when no analysis resolves it.
_Avoid_: Unit, group, lattice node

**Lexeme Target**:
the Segments that realize one Lexeme occurrence, produced at intake: its
Members with roles, exactly one Head, one Route Mass over Lexeme Kinds, and,
when the head is closed-class, its Identity Candidates. Every ResolvableText
Segment belongs to exactly one Lexeme Target. A word intake cannot place is a
singleton whose Route Mass favours Unresolved. `zur` is two: the ADP `zu`
and the Article `r` of the noun that follows.
_Avoid_: word, token group

**Phraseme Target**:
the Lexeme Targets that are fixed lexical members of one expression,
produced at intake: its member words, one Kind Mass over Phraseme Kinds with
`None`, and its fixedness. It never lists a Segment; its span is its
members' Segments. A word belongs to at most one Phraseme Target.
_Avoid_: expression, nested target, idiom group

**Kind Mass**:
a Phraseme Target's distribution over Phraseme Kinds, `None` and
Unresolved. The fixedness Score establishes the expression; the Kind Mass
names it.
_Avoid_: phraseme route

**Fixedness**:
the fixedness Score of a word inside the wording around it: free
combination, preferred combination, collocation, fixed expression. Only a
word at or above the floor is a member of a Phraseme Target; the target's
fixedness is the mean over its words.
_Avoid_: confidence, idiomaticity

**Member**:
one Segment inside a Lexeme Target with its Member Role: Head,
SeparableParticle, GovernedPreposition, Reflexive, Expletive, Article,
Auxiliary, or Unresolved. Roles say what a member is inside its target; they
do not move membership.
_Avoid_: role mass, Free member

**Realized Slot**:
a preposition slot the sentence realizes, linked to the Lexeme or Phraseme
Target that lexically selects the preposition. Its marker is the Segment
realizing the preposition (a preposition or a fused word's adposition); a
pronominal adverb realizes the preposition and its filler at once, so it
stays its own unit and is the slot's filler instead. The complement names
the preposition's Lemma, its case and its referent. Intake records only
preposition slots; bare-case slots come from the Knowledge call's frame.
Each preposition and case gives the governor's Valency Frame an Optional
Preposition Slot. Until the Knowledge call proposes the whole frame, realized
slots are the frame's only source (ADR 0034).
_Avoid_: government list, valency guess, governed-preposition prompt

**Route Mass**:
the Lexeme Target's distribution over Lexeme Kinds, including Unresolved.
Family is derived from Kind. No route, confidence or Family is stored beside
it.
_Avoid_: route, classification

**Identity Candidates**:
the Lexeme Target's distribution over the authored members its closed-class
head can realize, plus NoMatch and Unresolved. The winning candidate implies
the route.
_Avoid_: headword, per-member identity

**Identity State**:
what the Resolution Selector says about a Member: Selected (the head has a
winning candidate), Derived (a non-head role whose identity follows from the
target's shape and grammar, such as an Auxiliary's AUX Reading or an
Article's surface), Open (no candidates; generation continues), or Miss (a
closed-class route with no candidate).

**Resolution Selector**:
the one pure function that turns a Sentence Analysis's masses into resolved
values under the current policy: the Unresolved floor, identity implies
route, Family from Kind, Identity State from role and candidates, the
fixedness floor and the named Kind of a Phraseme, and the largest unit at an
offset. It ships with the package and is what the sentence corpus scores.
_Avoid_: stored resolution, threshold migration

**Grammatical Resolution**:
production of a click-independent Attestation for
an already classified Analysis Target, whether the Sentence Analysis or
classification supplied it.

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
relation claims that Dumgen selects under its production policy.

**Fixed Catalog**:
the reviewed Authored Content that bounds a Closed Route.

**Fixed Population**:
reviewed Authored Content within an Open Route. A miss
continues through generation.

**Closed Route**:
a production route that resolves only within its Fixed Catalog.

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
