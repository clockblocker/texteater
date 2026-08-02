---
status: accepted
supersedes: 0001-separate-entry-identity-from-lemma-form.md
---

# Lemma is grammatical identity and Reading is semantic identity

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

Semantic identity is intentionally outside Dumling. The cross-context name for
one learner's semantic unit is `Reading`:

```text
Reading {
  lemma
  emojiDescription
}
```

A Reading is identified by the pair `(Lemma, emojiDescription)` within one
learner's dictionary. The emoji description is a stable semantic label for
that learner. It contains one emoji or a compact emoji sequence, never Lemma
text, a gloss, or prose. The classifier receives the learner's existing Lemmas
and emoji descriptions, reuses an existing Reading when it is close enough, or
proposes a new Reading. Learners do not manually split semantic identity.

This deliberately accepts that grammatically indistinguishable homonyms and
polysemous uses reach the same Lemma first. Reading performs the semantic split
without introducing a Dumling `Meaning` or `Sense` DTO.

## Consequences

- Dumling exposes `Lemma`, `Surface`, and `Selection`; it does not expose
  `LinguisticEntry`, `Meaning`, `Sense`, or `Reading` DTOs.
- Lemma fields use `canonicalForm`, `family`, `kind`, and `coreFeatures`.
- Surface points to `lemma`, owns inflectional features, licensed spelling
  variation, and realization coverage.
- Selection owns only sentence-local click evidence and noisy attestation.
- Dumdict may model Reading and learner-facing dictionary records, but those
  concerns do not alter Dumling's grammatical topology.
- Relations are separate from this decision. Grammatical relations may connect
  Lemmas; semantic relations may connect Readings.
