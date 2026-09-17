---
status: accepted
---

# Keep Semantic Relations inside one Family

A direct Semantic Relation's target shares its source Reading's Family:
Lexeme relations target Lexemes, Phraseme relations target Phrasemes. The
rule binds model-proposed Pending Semantic Relations and hand-authored
closed inventories alike, in generation, review, and propagation.

Luna proposes candidate Canonical Forms. TypeSafe subsequently judges each
candidate's Kind and relation over the permitted options, including no relation,
other Family and uncertainty. Dumgen supplies the source Language and Family
and validates the resulting Pending Semantic Relation. A target's Kind may
differ from the source Kind. This replaces the earlier requirement to generate
Kind alongside text and avoid later classification.

For a German Lexeme/Noun Reading of `Bank`, Luna may propose `Geldinstitut`.
TypeSafe judges its Kind and relation; code adds `de` and `Lexeme` to the Unit
Shadow. A cross-Family proposal is rejected rather than forced into a Lexeme
Kind. Uncertainty produces no asserted relation.

The cost is losing plausible cross-Family phrasing relations, such as an Idiom
offered as a Noun's synonym; if a real need emerges, this ADR is revisited.
ADR-0016 owns endpoint-kind homogeneity (Lemma versus exact Reading).
