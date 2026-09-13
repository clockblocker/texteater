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
