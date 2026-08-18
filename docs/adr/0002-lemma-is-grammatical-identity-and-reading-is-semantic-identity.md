---
status: accepted
supersedes: 0001-separate-entry-identity-from-lemma-form.md
partially-superseded-by:
  - 0003-attestation-supersedes-selection-and-owns-realization-coverage.md
  - 0008-make-reading-a-foundational-dumling-value.md
---

# Lemma is grammatical identity and Reading is semantic identity

The Selection topology, Selection identity, and Surface realization-coverage
clauses in this ADR are superseded by ADR 0003. Its Lemma identity,
Surface-to-Lemma, and semantic-identity decisions remain accepted. ADR 0008
supersedes only the package-ownership decision that kept the Reading DTO and
its identity operation outside Dumling; dictionary-scoped Reading equality by
`(Lemma, emojiDescription)` remains accepted.

The system will use `Lemma` for the normalized, identity-bearing grammatical
node shared by every Dumling family. Dumling's complete resolution chain is:

```text
Selection -> Surface -> Lemma
```

A Lemma consists of its language, `canonicalForm`, `family`, `kind`, and
`coreFeatures`. `Lexeme`, `Phraseme`, `Morpheme`, and `Construction` remain peer
families. The term `LinguisticEntry` is removed rather than retained as an
alias.

## Identity policy

Lemma identity is grammatical identity. Two candidates are the same Lemma when
their language, canonical form, family, kind, and core features are the same.
Inflectional features remain on Surface and do not split Lemmas.

Consequently, homonyms that are grammatically indistinguishable share one
Lemma. Homographs with different grammatical analyses remain different Lemmas;
for example, a German noun and verb with the same spelling have different
kinds, and overlapping inflected forms remain different Surfaces whenever they
resolve to different Lemmas or carry different inflectional features.

Surface identity includes the Lemma it realizes. Selection identity remains
`(segmentedSentenceId, clickedSegmentIndex)`.

## Semantic identity

Semantic identity is intentionally separate from Dumling's grammatical
topology. The cross-context name for one dictionary-scoped semantic unit is
`Reading`:

```text
Reading {
  lemma
  emojiDescription
}
```

A Reading is identified by the pair `(Lemma, emojiDescription)` within one
learner's dictionary. The emoji description is a stable semantic label for
that learner. It contains one to four Unicode RGI emoji graphemes, never Lemma
text, a gloss, or prose. The classifier receives the learner's existing Lemmas
and emoji descriptions, reuses an existing Reading when it is close enough, or
proposes a new Reading. Learners do not manually split semantic identity.

This deliberately accepts that grammatically indistinguishable homonyms and
polysemous uses reach the same Lemma first. Reading performs the semantic split
without introducing a Dumling `Meaning` or `Sense` DTO.

## Consequences

- Dumling exposes `Lemma`, `Surface`, and `Selection`; it does not expose
  `LinguisticEntry`, `Meaning`, or `Sense`. The clause excluding a `Reading`
  DTO is superseded by ADR 0008.
- Lemma fields use `canonicalForm`, `family`, `kind`, and `coreFeatures`.
- Surface points to `lemma`, owns inflectional features, licensed spelling
  variation, and realization coverage.
- Selection owns only sentence-local click evidence and noisy attestation.
- Dumdict owns dictionary scope and learner-facing Reading records, but those
  concerns do not alter Dumling's grammatical topology. ADR 0008 moves the
  foundational Reading value and its identity operation to Dumling.
- Relations are separate from this decision. Grammatical relations may connect
  Lemmas; semantic relations may connect Readings.
