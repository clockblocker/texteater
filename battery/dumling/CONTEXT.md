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
A word-like Lemma. A Lexeme is one Lemma Family, not a synonym for Lemma.

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
The learner-scoped semantic identity formed by one Lemma and one Emoji
Description. Reading belongs outside Dumling; Dumling ends at Lemma.
_Avoid_: Meaning, Sense, Semantic Unit, dictionary entry

**Emoji Description**:
The stable learner-scoped semantic label that distinguishes Readings of the
same Lemma. A classifier reuses an existing Reading when it is close enough or
creates a new Reading; learners do not manually split semantic identity.

**Surface**:
A reusable global grammatical form that realizes exactly one Lemma
under one grammatical analysis. It carries the normalized contextual form,
canonical-or-variant spelling status, full-or-partial realization coverage,
Surface kind, applicable inflectional features, and the Lemma it realizes.

Surface identity is the tuple of language, normalized contextual form, Surface
kind, applicable inflectional features, and Lemma identity. Neither coverage
nor an embedded copy of the Lemma's fields establishes a different Surface
identity.

`normalizedSurface` may repair a typo or ordinary casing, but it preserves the
attested constituent order and contextual inflection. It never inserts missing
lexical constituents or replaces a contextual realization with the Lemma's
Canonical Form.

**Selection**:
The attestation-local result of resolving one learner click to a Surface. Its
identity is exactly `(segmentedSentenceId, clickedSegmentIndex)`; it has no
independent generated ID.

A Selection records ordered unique `surfaceSegmentIndices`, the
application-constructed `attestedSurface`, and whether the clicked Segment's
orthography is `Standard` or a `Typo`. Typo status belongs to Selection because
it describes noisy input; licensed orthographic variation belongs to Surface.
Only successfully resolved clicks become Selections.

## Segmentation boundary

The segmenter owns the immutable Segmented Sentence aggregate and its indexed
`ResolvableText`, `OpaqueText`, `Whitespace`, and `Punctuation` Segments.
Dumling owns only the branded foreign `SegmentedSentenceId` reference and the
indices recorded by Selection. Consequently, Dumling can validate index shape,
order, uniqueness, and inclusion of the clicked index, but the segmenter must
validate bounds, Segment kinds, and construct `attestedSurface` from the
authoritative sentence.
