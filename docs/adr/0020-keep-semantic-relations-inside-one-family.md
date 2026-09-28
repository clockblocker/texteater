---
status: accepted
---

# Keep Semantic Relations inside one Family

A direct Semantic Relation's target stays in its source Reading's relation
space. Lexeme and Locution share one space, so a relation may cross between
them (`ins Gras beißen` ↔ `sterben`, `zum Teil` ↔ `teilweise`). Every other
Family is a space of its own: a Saying relates only to Sayings. The rule binds
model-proposed Pending Semantic Relations and hand-authored closed inventories
alike, in generation, review and propagation. A target's Kind may differ from
the source Kind.

A proposal that leaves the space is rejected rather than forced into a Kind of
the source's space, and uncertainty produces no asserted relation. How Dumgen
proposes and judges candidates is Dumgen ADR 0003.

The cost is losing plausible relations across spaces, such as a proverb
offered as a word's paraphrase. If a real need emerges, this ADR is revisited.
ADR 0011 owns endpoint-kind homogeneity (Lemma versus exact Reading).

Until ADR 0039 split the Phraseme Family, the space was the Family itself, and
an Idiom could not be a Noun's synonym.
