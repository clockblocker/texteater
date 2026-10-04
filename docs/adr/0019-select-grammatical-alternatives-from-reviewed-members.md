---
status: accepted
---

# Select grammatical alternatives from reviewed members

Grammatical navigation selects authored members by their Core Features. A
query starts with a reviewed member and names the coordinates allowed to vary;
it preserves every other feature, including pronoun subtype, and compares null
literally. Missing coordinates return no members. The query never synthesizes a
Cartesian product, infers membership from spelling, or stores subgroup IDs.

This replaces explicit Counterpart claims, Grammatical Series compilation and
grammatical relation projection. Those abstractions connected distinct
spellings without reliably preserving their claimed axis. Semantic Relation
algebra stays in Dumrel. The reviewed members are `dumcorpus`'s Authored
Inventories, and the selection lives beside them in `dumcorpus/inventories`.
`selectGrammaticalAlternatives`, which tf-demo's Note navigation calls, is a
pure function over the inventories, next to the selectors that tf-demo's
dictionary transaction and Dumgen share
([ADR 0021](./0021-close-routes-in-dumgen-and-author-closed-class-inventories-in-dumcorpus.md)).
Dumling owns values and validation.

German composition stores grammatical coordinates on the Surface. `dumcorpus`
derives a contextual component Surface and exact reviewed Reading when
requested (`deriveGrammaticalComponent`); neither value is embedded in the
parent or included in its identity. A noun Surface carries case and number,
with gender on the Lemma. Its article is a satellite member whose DET cell is
derived
([ADR 0040](./0040-make-the-article-a-satellite-of-its-phrase-head.md)).
German verbal Surfaces use nullable `expletive: Subject` for realized
nonreferential subject `es`, retaining the ordinary verb Lemma. Null means
absent composition, not unresolved evidence.

This replaced embedded noun article references under
[issue 472](https://github.com/clockblocker/texteater/issues/472). It avoids
making a noun's grammatical identity depend on authored Reading content.
Missing grammar is unresolved; missing reviewed content is a Catalog Miss.
Source spelling remains on Attestations, and a Fusion shows the words it holds
([ADR 0035](./0035-attest-articles-and-fused-words-segment-by-segment.md)).

Until ADR 0040, a noun Surface also carried an article category, and until
2026-09-27 Dumgen held the reviewed inventory itself.
