# Determiners: what the learner needs

This is the learner's problem with DETs. Any model for DETs has to solve it.
The current decisions are in [ADR 0032](../../../../docs/adr/0032-choose-core-features-per-route-for-the-learner.md)
and [ADR 0035](../../../../docs/adr/0035-attest-articles-and-fused-words-segment-by-segment.md).

## The problem

- **DETs are everywhere.** In a language that has them, they are among the
  most common words, and a long sentence can hold many of them.
- **German inflects a noun and its DET together.** Case, number and gender
  show up across both words (`dem Wald`, `der Frau`), so the DET is part of
  how the noun appears in the sentence.
- **DETs hide inside other words.** German `im` holds `dem`. Hebrew `בבית`
  holds a `ה` that has no letters of its own.
- **Proper nouns have odd DET rules.** Some are always cited with their
  article (`die Schweiz`), and others never are (`Berlin`).

## What the learner needs

- **Clicking a noun's DET should not resolve it as a DET.** After the first
  session, opening `der` as a determiner is useless. The click should lead
  to the noun it belongs to.
- **DETs keep their own Lemmas and Readings.** The learner must still be able
  to drill down to a DET from another Note.
- **German Noun Notes show the right DET in the header.** Seeing `der`, `die`
  or `das` with the noun helps the learner remember its gender. This is only
  a projection of the noun's gender and needs nothing extra stored in the
  model.
