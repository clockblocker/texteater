# Dumling Context

Dumling names and describes the language-specific linguistic entities that
learner text can resolve to.

## Language

**Lemma**:
A normalized, identity-bearing grammatical entity described by its language,
Canonical Form, Family, Kind, and Core Features. Grammatically indistinguishable
homonyms share one Lemma; `Lexeme`, `Phraseme`, `Morpheme`, and `Construction`
are peer Families.
_Avoid_: Linguistic Entry, Lemma Form, dictionary entry

**Lexeme**:
A lexical Lemma whose fixed realization may contain one or more members. German
`rechnen … mit` is one `VERB` Lexeme even when the verb and its governed
preposition are realized separately; a Lexeme is one Lemma Family, not a
synonym for Lemma.

**Verbal Participle**:
A participial Surface whose contextual use belongs to a `VERB` or `AUX` Lexeme.
Its Canonical Form is the verbal dictionary form rather than the participial
spelling. Productive perfect, passive, and German state-passive uses are verbal
participles.

**Participial Adjective**:
An adjectivally used participial form that resolves to an `ADJ` Lexeme rather
than to its source verb. Its Canonical Form is the adjective's participial
citation form. German Partizip I in ordinary adjectival functions, attributive
or adverbial Partizip II, and lexicalized or idiomatized predicative Partizip II
are participial adjectives.

**Collocation**:
A conventional multiword Phraseme whose lexical component choices are
restricted while its overall meaning remains non-idiomatic. German support-verb
expressions such as `eine Entscheidung treffen` are Collocations.
_Avoid_: Idiom, free phrase

**Canonical Form**:
The normalized form used to name a Lemma. It participates in Lemma identity
but is not sufficient to identify a Lemma without its language, Family, Kind,
and Core Features.
_Avoid_: Citation Form, Lemma Form

**Family**:
The broad grammatical class of a Lemma: `Lexeme`, `Phraseme`, `Morpheme`, or
`Construction`.
_Avoid_: Entry Family

**Kind**:
The concrete subtype of a Lemma within its Family, such as `NOUN`, `VERB`,
`Prefix`, or `Idiom`.
_Avoid_: Entry Subkind

**Core Features**:
The stable grammatical features that complete a Lemma's identity within its
language, Family, and Kind.
_Avoid_: Inherent Features

**Route Closure**:
The language-specific policy that classifies a language, Family, and Kind route
for Lemma and Reading production as `Open` or `Closed`. Dumling owns the
exhaustive policy outside the entity DTOs and exposes route queries; closure is
not part of Lemma or Reading identity. Every Closed Reading route is also a
Closed Lemma route, while a Closed Lemma route may remain Open for Reading
production; German `Lexeme/ADP`, whose Lemmas are closed but whose contextual
Readings include distinctions such as `🤝`, `🛠️`, and `🔗`, is the motivating
example. Reading closure also governs production of the Reading's Knowledge
because Knowledge maps one-to-one to an exact Reading. Unspecified route leaves
default to Open. A Closed leaf is an explicit promotion asserting that the
route's separate Closed implementation is operational and its fixed catalog
has been reviewed to its declared coverage; linguistic closedness alone does
not justify promotion. A missing catalog member is an observable Catalog Miss
and never falls through to Open production. Closed members use the same entity
DTOs, identity operations, and persistence plumbing as every other member;
only their internal production route differs.
_Avoid_: DTO closure flag, Knowledge closure

**Fixed Catalog**:
A package-owned, hand-authored collection of ordinary linguistic values for a
route, published with either `Complete` or intentionally non-exhaustive
`Curated` coverage for a named scope.
_Avoid_: Seed table, Closed DTO collection

**Fixed Population**:
A `Curated` package-owned set of ordinary Lemmas and Readings inside an Open
Route. Exact members may be selected deterministically, while a non-member
continues through ordinary Open behavior and never produces a Catalog Miss.
The German PRON population distinguishes formal singular and plural addressee
identities through Core `referenceNumber`; morphologically plural Surface
number is not addressee identity evidence.

The general inflection topology names one paradigm by its singular citation
form, normally masculine singular, and keeps Case, Gender, and Number
realizations as Surfaces. A reviewed Fixed Population may deliberately promote
selected grammatical coordinates into separate learner-facing Lemmas and
Readings. German total PRON uses that exception for singular `alles` and plural
`alle`; `allem` remains a Surface of `alles`, while `allen` and `aller` remain
Surfaces of `alle`. The reviewed demonstrative and relative `der/die/das` PRON
populations take the stronger exact-form exception: each of `der`, `die`, `das`,
`den`, `dem`, `dessen`, `deren`, and `denen` is one Lemma per `pronType`, while
Case, Gender, and Number remain Surface evidence. Homographic demonstrative and
relative forms never share an identity.
_Avoid_: Partially Closed Route, fallback catalog

**Free `sich`**:
The independently resolvable personal/reflexive pronoun `sich`, distinct from a
verb-owned reflexive member. A plural context may expand its interpretation to
reciprocal meaning without changing its Lemma, Reading, or `pronType=Prs`;
lexical reciprocal PRON such as `einander` remains a distinct identity.
_Avoid_: Reciprocal `sich`, `pronType=Rcp` `sich`

**Standalone `einander`**:
The invariant German reciprocal PRON is one fixed Lemma, one fixed `↔️`
Reading, and one canonical Citation Surface with no Core or Inflectional
Features. Its fixed Reading targets the fixed free `sich` Lemma with a Near
Synonym claim.
_Avoid_: Case-specific `einander`, `pronType=Rcp` `einander`

**Reciprocal Pronominal Adverb**:
A German `Lexeme/ADV` whose whole form combines a prepositional element with
`einander` in reciprocal use, such as `miteinander` or `voneinander`. Each
whole form is one Lemma; its internal composition belongs to Morphological Tree
Knowledge rather than separate occurrence targets.
_Avoid_: `preposition + einander` PRON, reciprocal PRON compound

**Catalog Miss**:
A structured production result stating that an explicitly promoted route has
no fixed member for the supplied linguistic candidate. It is catalog-growth
evidence, not `Unresolved` and not permission to invoke Open production.

**Reading**:
A foundational semantic value formed by exactly one Lemma and one Emoji
Description. Dumling owns its DTO, schema, value equality, and stable
tuple-derived identity operation; a dictionary establishes the learner or
hosted scope in which that equality applies and owns any Reading record. For a
Closed Route, Dumling also owns the corresponding `Complete` or `Curated`
Fixed Catalog of ordinary Reading values; they do not form a specialized DTO
class.
_Avoid_: Meaning, Sense, Semantic Unit, dictionary entry

**Emoji Description**:
The stable dictionary-scoped semantic label that distinguishes Readings of the
same Lemma. A classifier reuses an existing Reading when it is close enough or
creates a new Reading; learners do not manually split semantic identity.

**Surface**:
A reusable global grammatical form that realizes exactly one Lemma
under one grammatical analysis. It carries the normalized contextual form,
canonical-or-variant spelling status, Surface kind, applicable inflectional
features, and the Lemma it realizes.

Surface identity is the tuple of language, normalized contextual form, Surface
kind, applicable inflectional features, and Lemma identity. An embedded copy of
the Lemma's fields does not establish a different Surface identity.

`normalizedSurface` may repair a typo or ordinary casing, but it is the
one-space projection of the Attestation members in occurrence order. The sole
licensed contextual completion is German `Lexeme/NOUN` with an official
trailing Ergänzungsstrich under system ADR 0004; it preserves one-to-one member
cardinality and attested source identity. Otherwise normalization never inserts
unrealized material or replaces a contextual realization with the Lemma's
Canonical Form. Because Surface identity includes this projection,
adding a previously omitted fixed realized member intentionally creates a
different Surface without changing the linked Lemma's identity.

**Attestation**:
A fleeting, click-independent occurrence value linked to one Surface. It has a
non-empty ordered list of members, `Full | Partial` realization coverage, and
the linked Surface. It has value equality only: no identity, ID codec,
repository, durable lifecycle, or standalone archival contract.

Each member pairs its exact non-empty attested text with `Standard | Typo`
orthography evidence. Typo evidence belongs to the occurrence; licensed
Canonical or Variant spelling belongs to Surface.

`Full` means every realized fixed component owned by the linked grammatical
entity is present in the occurrence and in the member list. `Partial` means
entity-owned lexical material is genuinely unrealized while the exact Surface
and Lemma remain defensible. Missing free arguments, complements, adjuncts,
discontinuity, intervening context, typo repair, and casing repair do not
themselves make an Attestation Partial. An overt governed preposition,
inherently reflexive pronoun, separable member, or perfect/future/passive
auxiliary fixed by the Analysis Target is entity-owned occurrence material;
omitting it is an alignment error, not Partial coverage.

A conventional truncation may be Partial when its realized wording still
identifies one exact Phraseme. German `was zum …` is a Partial Attestation of
the Idiom `was zum Teufel`: `was` and `zum` are realized members, while
`Teufel` remains part of the Lemma's complete lexical inventory. A generic
unfinished fragment that does not identify one exact Phraseme is not promoted
by this exception.

An inherently reflexive member inside a lexically reflexive VERB target
contributes only to that VERB Attestation in the current Click Resolution
Chain. It has no independent PRON Attestation, Surface, Lemma selection, or
Reading selection until Component Drilldown and #250 settle that topology.
Contextual reflexive arguments selected as their own PRON Analysis Targets are
unaffected.

This verb-owned class includes middle-like `sich` in `Die Schrift liest sich
leicht`; the VERB Lemma has Core Feature `lexicallyReflexive=Yes`. Free-ish
personal and reflexive arguments remain ordinary PRON occurrences instead:
`sich` in `Sie begrüßen sich`, `mich` in `Ich dusche mich`, and `mir` in `Ich
wasche mir die Hände` or `Ich kaufe mir etwas` resolve to their promoted
exact-form Lemmas. Their Surface carries `reflex=Yes` when the occurrence is
coreferential with the subject. In `Sie begrüßen sich`, reciprocity is a
contextual expansion of free `sich`; it is not part of the pronoun's identity
and does not mint a `pronType=Rcp` Lemma or Reading.
_Avoid_: Selection, click result, selected Surface

## Segmentation boundary

Dumgen and the segmenter own the immutable Segmented Sentence aggregate,
clicks, target membership, member Segment indices, marked context, bounds, and
Segment-kind validation. They project ordered member strings into Dumling.
Dumling validates only the strict Attestation value: non-empty paired member
evidence, realization coverage, and the linked grammatical Surface.
