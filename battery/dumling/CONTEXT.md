# Dumling Context

Dumling names and describes the language-specific linguistic entities that
learner text can resolve to.

## Language

**Linguistic Entry**:
A reusable, language-specific identity with one family, one citation form, and
the inherent grammatical features applicable to that family. `Lexeme`,
`Phraseme`, `Morpheme`, and `Construction` are peer families.
_Avoid_: Lemma entry, dictionary sense

**Lexeme**:
A word-like Linguistic Entry whose identity distinguishes homonymy while
allowing polysemous uses to remain together. Matching spelling, grammar, and
inflectional paradigm do not by themselves prove Lexeme identity.
_Avoid_: Lemma

**Lemma Form**:
The canonical citation form of one Lexeme. It is descriptive text rather than
an identity-bearing node, and multiple Lexemes may share it.
_Avoid_: Canonical Lemma, Lemma identity

**Citation Form**:
The canonical form used to name a Linguistic Entry. A Lexeme's Citation Form is
its Lemma Form.

**Sense**:
An optional, authority-scoped lexicographic subdivision of one Linguistic
Entry. It does not establish Linguistic Entry identity and is not a
learner-owned grouping.
_Avoid_: Meaning

**Meaning**:
A learner-owned, note-worthy grouping of contextual uses for one Linguistic
Entry. Meaning boundaries neither establish homonymy nor have to reproduce
Sense boundaries.
_Avoid_: Sense

**Surface**:
A reusable global grammatical form that realizes exactly one Linguistic Entry
under one grammatical analysis.

**Selection**:
The attestation-local result of resolving one learner click to a Surface.
