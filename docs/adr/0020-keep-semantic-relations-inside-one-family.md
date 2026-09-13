---
status: accepted
---

# Keep Semantic Relations inside one Family

A direct Semantic Relation's target shares its source Reading's Family:
Lexeme relations target Lexemes, Phraseme relations target Phrasemes. The
rule binds model-proposed Pending Semantic Relations and hand-authored
closed inventories alike, in generation, review, and propagation.

For each generated relation target, the model supplies Canonical Form and
Kind in the same response that proposes the relation. Dumgen supplies the
language from the generation route and copies the source Reading's Family
in code. It validates that the proposed Kind belongs to that Family's
inventory. The target's Kind may differ from the source's Kind; it is not
copied from the source. No separate target-classification model call is needed.

For example, given a German Lexeme/Noun Reading of `Bank`, the model proposes
`Geldinstitut` with Kind `NOUN`. Dumgen adds `de` and `Lexeme` to form the Unit
Shadow used for dictionary matching.

The cost is losing plausible cross-Family phrasing relations, such as an Idiom
offered as a Noun's synonym; if a real need emerges, this ADR is revisited.
ADR-0016 owns endpoint-kind homogeneity (Lemma versus exact Reading).
