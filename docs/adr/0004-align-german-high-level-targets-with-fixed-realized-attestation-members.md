---
status: accepted
extends: 0003-attestation-supersedes-selection-and-owns-realization-coverage.md
partially-supersedes:
  - "texteater#74"
  - "texteater#76"
---

# Align German high-level targets with fixed realized Attestation members

German High-Level Target Classification is a public Dumgen action whose Analysis Target is an ordered, click-invariant group of clickable `ResolvableText` Segments, not a Dumling entity. Every realized fixed component of that target becomes exactly one positionally aligned Attestation member: the target index, source Segment text, marked-context `TARGET` pair, member orthography, and Attestation member all describe the same occurrence position. German fixed components include governed prepositions, inherently reflexive pronouns, separable members, and the auxiliaries of perfect, future, and passive complexes. Modal auxiliaries with lexical verbs, copulas with predicates, free arguments, contextual reflexives, adjuncts, and modifiers remain separate high-level units. `Lexeme/PUNCT` remains a Dumling Lemma kind but is unreachable through this clicked action because punctuation is not `ResolvableText`.

High-level grouping does not remove later drill-down classification of an AUX, preposition, pronoun, or separable member. The resolved Surface and Lemma instead belong to the route-owning lexical head or whole Phraseme. `normalizedSurface` is the one-space, source-order projection of exactly the target members, including repeated same-text members at distinct positions, while `canonicalForm` continues to name the Lemma and need not concatenate occurrence members. VERB Surface features remain the morphology of the lexical head: perfect and passive participles stay participial, future infinitives stay infinitival, and finite auxiliary features are not copied onto the head. `Full` means all realized entity-owned material is present; absent free complements or adjuncts do not make an Attestation `Partial`, while omitting an overt fixed target member is invalid rather than Partial.

The private Grammatical Resolution projection returns `normalizedMembers`, not the public scalar. Each entry aligns by position with one target, marked-context, orthography, and Attestation member. A shared validator enforces cardinality, source order, Standard-member identity under Unicode normalization and licensed casing, and canonical internal spacing; Dumgen then joins the entries with one space to construct `normalizedSurface`. Typo repair remains an authored route-prompt judgment, so this seam does not introduce an edit-distance spelling policy or collapse licensed variants.

This intentionally changes Surface identity whenever the expanded target changes `normalizedSurface`; Lemma and Reading identity algorithms remain unchanged. It extends ADR 0003's generic Attestation topology. It supersedes #74 only where that decision excluded an overt governed preposition itself, and supersedes #76's private-only Analysis Target boundary; their generic Attestation decisions remain in force.
