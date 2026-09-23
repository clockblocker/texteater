---
status: accepted
---

# Store preposition government as Reading Knowledge

A governor's lexically governed prepositions are a structured Knowledge
aspect, `governedPrepositions`, on the governor's Reading. Each entry names
the German ADP Lemma and the case that preposition assigns in this
construction: `warten` stores `auf` + Acc, and `stolz` stores `auf` + Acc.
The preposition stores nothing. Its view, "which Readings govern me", is an
inferred `governedBy` projection over the dictionary inventory, following ADR
0012's rule that only direct claims are stored.

The claim sits on the Reading because government separates senses of one
Lemma: `bestehen auf` + Dat (insist), `bestehen aus` + Dat (consist of) and
`bestehen` (pass an exam) are three Readings of `bestehen` after ADR 0029
merged the Lemmas. The case is part of the claim because a two-way
preposition's Lemma fixes no case: `warten auf` takes Acc and `bestehen auf`
takes Dat. When the ADP Lemma does fix a case (`für` + Acc), a claim with
another case is invalid.

Government is not a Semantic Relation. Its edges carry a case, cross
Families (the Collocation `Bescheid wissen` governs the Lexeme `über`, which
ADR 0020 forbids for Semantic Relations) and have no algebra beyond one
inverse. A separate Grammatical Relation store would duplicate the
Contribute, Correct and Retract operations Knowledge already has.

German VERB, ADJ and NOUN Lexemes and Collocation and Idiom Phrasemes request
the aspect. Dumgen generates it from the Reading and its marked sentence,
choosing only from a reviewed list of governable prepositions whose ADP Lemmas
match the ones Grammatical Resolution produces. Learner-facing text such as
"warten auf + Akkusativ" is rendered from the claim and never stored as free
text.

Consequences: an Attestation's `governedPrepositionEvidence` records one
occurrence, and the Reading's `governedPrepositions` records the type-level
claim. Clicking a verb's governed preposition opens the verb, because intake makes
it a member of the verbal unit. Clicking the preposition of an adjective,
noun or Phraseme opens the preposition, whose `governedBy` view lists that
Governor. A pronominal adverb such as `darauf` reaches its
governors through its preposition, while government stays on the governor.
