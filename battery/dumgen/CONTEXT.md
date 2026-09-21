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
one Sentence as intake leaves it: language, Stitched Text, Segments, its
Analysis Targets, and its Fusions with each component pointing at a Segment.
_Avoid_: Sentence DTO, sentence analysis

**Encounter**:
a Segmented Sentence together with one Analysis Target supplied
for linguistic resolution or Knowledge production.

**Analysis Target**:
one clickable group produced at intake: its Members, one Route Mass, and, when
the head is closed-class, its Identity Candidates. Every ResolvableText
Segment belongs to exactly one Analysis Target; targets do not nest. A word
intake cannot place is a singleton target whose Route Mass favours
Unresolved.
_Avoid_: Unit, group, lattice node

**Member**:
one Segment inside an Analysis Target with its Member Role: Head,
SeparableParticle, GovernedPreposition, Reflexive, Expletive, Article,
Auxiliary, or Unresolved. Roles say what a member is inside its target; they
do not move membership.
_Avoid_: role mass, Free member

**Route Mass**:
the Analysis Target's distribution over Kinds, including Unresolved. Family is
derived from Kind. No route, confidence or Family is stored beside it.
_Avoid_: route, classification

**Identity Candidates**:
the Analysis Target's distribution over the authored members its closed-class
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
the one pure function that turns a Segmented Sentence's masses into resolved
values under the current policy: the Unresolved floor, identity implies
route, Family from Kind, Identity State from role and candidates. It is
versioned with the code and is what the intake lab scores.
_Avoid_: stored resolution, threshold migration

**Grammatical Resolution**:
production of a click-independent Attestation for
an already classified Analysis Target.

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
