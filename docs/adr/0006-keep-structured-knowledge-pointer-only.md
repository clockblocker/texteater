---
status: accepted
---

# Keep structured Knowledge pointer-only

Morphological Tree stores an ordered hierarchy whose leaves point to Morpheme
Readings or lexical Unit Shadows. Prompt roles, source coordinates, alignment,
and alternative analyses are transient execution data and disappear before
Dumrel Knowledge projection.

This ADR also stored a Lexical Breakdown, an ordered list of Lexeme Unit
Shadows, in Reading Knowledge.
[ADR 0041](./0041-judge-dumling-fields-by-the-learner-and-by-classification.md)
rejected that: a Locution's or Saying's Breakdown belongs to its Lemma, and its
parts are real Readings.
[#720](https://github.com/clockblocker/texteater/issues/720) removed the
`lexicalBreakdown` aspect.
