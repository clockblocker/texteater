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

**Reading**:
A foundational semantic value formed by exactly one Lemma and one Emoji
Description. Dumling owns its DTO, schema, value equality, and stable
tuple-derived identity operation; a dictionary establishes the learner or
hosted scope in which that equality applies and owns any Reading record.
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
_Avoid_: Selection, click result, selected Surface

## Segmentation boundary

Dumgen and the segmenter own the immutable Segmented Sentence aggregate,
clicks, target membership, member Segment indices, marked context, bounds, and
Segment-kind validation. They project ordered member strings into Dumling.
Dumling validates only the strict Attestation value: non-empty paired member
evidence, realization coverage, and the linked grammatical Surface.
