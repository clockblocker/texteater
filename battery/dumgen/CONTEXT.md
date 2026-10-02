# Dumgen

Dumgen produces linguistic Units and Knowledge for supplied encounters. Each
entry links the ADRs that hold the term's precise definition, edge cases and
examples.

## Language

**Segment**:
The one clickable piece of a Segmented Sentence. A fused word yields one
Segment per component, and a Segment's character offset in the Stitched Text
is the persisted occurrence coordinate. See [Dumgen ADR 0004].
_Avoid_: Piece, token, Segment index as identity

**Segmented Sentence**:
One Sentence as intake leaves it: language, Stitched Text and Segments.
_Avoid_: Sentence DTO

**Stitched Text**:
One Sentence's text once code has normalized its mechanical whitespace:
trimmed, with every run of spaces, tabs or other non-line-break whitespace
turned into one ASCII space. Line breaks stay as written. Its Segments
concatenated give it back. No judge sees whitespace (#689).
_Avoid_: stitching question, repaired text

**`segment.inUnits`**:
The segmenter that routes clicks. It takes a text already split into
Sentences and groups each Sentence's Segments into biggest units, each with
its route or `Unresolved`. Its jev-based judges see one Sentence at a time.
See [Dumgen ADR 0007] and [Dumgen ADR 0008].
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

**Realized Slot**:
A preposition slot a Sentence realizes, linked to the unit that lexically
selects the preposition. Bare-case slots come from the Knowledge call's
Valency Frame instead. See [ADR 0034].
_Avoid_: government list, valency guess, governed-preposition prompt

**Grammatical Resolution**:
Production of a click-independent Attestation for an Analysis Target whose
route is already chosen.

**Referent Context**:
The Sentences just before and after an Encounter's Sentence in its Text.
Grammatical Resolution reads them only for a pronoun form whose cell its
referent decides, and attests the form's Syncretism (Dumling) when they leave
the referent open. See [ADR 0044] and [ADR 0046].
_Avoid_: surrounding text, paragraph context

**Authored Content**:
Reviewed Lemmas, fixed Readings, Knowledge and semantic relation claims that
Dumgen selects under its production policy. Dumspec's Authored Inventories
hold the closed-class members, and Dumgen reads them. See [ADR 0021].

**Fixed Catalog**:
The reviewed Authored Content that bounds a Closed Route. Its members are
authored in Dumspec, and Dumgen decides the closure. See [ADR 0021].

**Fixed Population**:
Reviewed Authored Content within an Open Route. See [ADR 0021].

**Closed Route**:
A production route that resolves only within its Fixed Catalog. See
[ADR 0021].

**Catalog Miss**:
Absence of a required authored value on a Closed Route or for an exact
authored Reading in a Fixed Population. See [ADR 0021].

**Grammatical Navigation**:
Selection of reviewed members by preserving fixed Core Features and varying
explicitly named coordinates. See [ADR 0019].

**Knowledge Production**:
Proposed Knowledge changes and Pending Semantic Relations for a
caller-supplied Reading in an Encounter. See [Dumgen ADR 0003].

**Evaluation Run**:
One recorded execution of a linguistic experiment, with its effective model
settings, case outputs, failures and evaluation results. See the
[evaluation reference].

### Legacy intake

These terms name the intake LegacyDumgen still ships, from [Dumgen ADR 0005]
and [Dumgen ADR 0006]; the [intake-owned units reference] holds its contract.
[Dumgen ADR 0007] supersedes both, and the segmentation rewrite removes these
terms with the code. The legacy intake still names Phraseme Kinds, which
[ADR 0039] replaced with Locution and Saying.

**Sentence Analysis**:
What the legacy intake stores beside one German Segmented Sentence: its
Lexeme Targets and Phraseme Targets over offset-keyed Segments.
`analyzeSentence` produces it, and hosts read it at selection time. See
[Dumgen ADR 0006].
_Avoid_: precomputed resolution

**Lexeme Target**:
The Segments that realize one Lexeme occurrence: its Members, exactly one of
them the Head, with a Route Mass and, for a closed-class head, Identity
Candidates. See [Dumgen ADR 0006].
_Avoid_: word, token group

**Phraseme Target**:
The Lexeme Targets that are fixed lexical members of one expression, with a
Kind Mass and a Fixedness. See [Dumgen ADR 0006].
_Avoid_: nested target, idiom group

**Kind Mass**:
A Phraseme Target's distribution over Phraseme Kinds. The Fixedness
establishes the expression; the Kind Mass names it. See [Dumgen ADR 0006].

**Fixedness**:
The score of how fixed a word is inside the wording around it. Only a word at
or above the floor is a member of a Phraseme Target. See [Dumgen ADR 0006].
_Avoid_: confidence, idiomaticity

**Member**:
One Segment inside a Lexeme Target with its Member Role. Roles stay inside
the legacy intake, and no Attestation records them. See [Dumgen ADR 0005] and
[ADR 0041].
_Avoid_: role mass, Free member

**Route Mass**:
A Lexeme Target's distribution over Lexeme Kinds, Unresolved included. See
[Dumgen ADR 0005].
_Avoid_: route, classification

**Identity Candidates**:
A Lexeme Target's distribution over the authored members its closed-class
head can realize. The winning candidate implies the route. See
[Dumgen ADR 0005].
_Avoid_: headword, per-member identity

**Identity State**:
What the Resolution Selector concludes about a Member's identity from its
role and its target's candidates. See [Dumgen ADR 0005].

**Resolution Selector**:
The pure function that turns a Sentence Analysis's masses into resolved
values, including the largest unit at an offset. See [Dumgen ADR 0005].
_Avoid_: stored resolution, threshold migration

[ADR 0019]: ../../docs/adr/0019-select-grammatical-alternatives-from-reviewed-members.md
[ADR 0021]: ../../docs/adr/0021-close-routes-in-dumgen-and-author-closed-class-inventories-in-dumspec.md
[ADR 0034]: ../../docs/adr/0034-store-valency-as-e-valbu-frames-on-the-reading.md
[ADR 0039]: ../../docs/adr/0039-split-phrasemes-into-locutions-and-sayings.md
[ADR 0041]: ../../docs/adr/0041-record-in-dumling-only-what-routing-and-drill-down-consume.md
[ADR 0044]: ../../docs/adr/0044-identify-german-pronouns-by-pillar-stem-and-referent.md
[ADR 0046]: ../../docs/adr/0046-generate-a-syncretism-for-each-form-only-its-referent-resolves.md
[Dumgen ADR 0003]: ./docs/adr/0003-split-german-knowledge-generation-by-family.md
[Dumgen ADR 0004]: ./docs/adr/0004-make-segment-the-one-clickable-dto-produced-at-intake.md
[Dumgen ADR 0005]: ./docs/adr/0005-intake-owns-segments-and-analysis-targets.md
[Dumgen ADR 0006]: ./docs/adr/0006-segment-in-two-layers-lexeme-targets-and-phraseme-targets.md
[Dumgen ADR 0007]: ./docs/adr/0007-segment-text-into-biggest-units-and-break-multiword-lemmas-down-apart.md
[Dumgen ADR 0008]: ./docs/adr/0008-judge-segment-in-units-by-membership-before-route.md
[evaluation reference]: ./docs/reference/evaluation.md
[intake-owned units reference]: ./docs/reference/intake-owned-units.md
