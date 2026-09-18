---
status: accepted
---

# Select grammatical alternatives from reviewed members

Grammatical navigation selects Dumgen-authored members by their Core Features.
A query starts with a reviewed member and names the coordinates allowed to vary;
it preserves every other feature, including pronoun subtype, and compares null
literally. Missing coordinates return no members. The query never synthesizes a
Cartesian product, infers membership from spelling, or stores subgroup IDs.

This replaces explicit Counterpart claims, Grammatical Series compilation and
grammatical relation projection in the replacement packages. Those abstractions
connected distinct spellings without reliably preserving their claimed axis.
Semantic Relation algebra stays in Dumrel. Dumgen owns the reviewed inventory
and its feature-based selection; Dumling owns values and validation.

German composition stores grammatical coordinates on the Surface. Dumgen derives
a contextual component Surface and exact reviewed Reading when requested; neither
value is embedded in the parent or included in its identity. Nouns retain article
category, case and number, with gender on the Lemma. German verbal Surfaces use
nullable `expletive: Subject` for realized nonreferential subject `es`, retaining
the ordinary verb Lemma. Null means absent composition, not unresolved evidence.

This replaces embedded noun article references under
[issue 472](https://github.com/clockblocker/texteater/issues/472). It avoids making
a noun's grammatical identity depend on authored Reading content while preserving
agreement-based article selection. Missing grammar is unresolved; missing reviewed
content is a Catalog Miss. Source spelling remains on Attestations. Fusions
continue to expose lexical breakdown.
