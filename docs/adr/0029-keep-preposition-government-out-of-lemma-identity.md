---
status: accepted
---

# Keep preposition government out of Lemma identity

A lexically governed preposition is valency, not identity. `warten auf` is
still `warten`, `bitten um` is still `bitten`, and `stolz auf` is still
`stolz`. The VERB Core Feature `hasGovPrep` is removed in every language, and
no Kind gains a governed-preposition Core Feature. Dropping the preposition
gives the same word without its complement, unlike `hasSepPrefix` and
`lexicallyReflexive`, which pick a different headword (`aufpassen` is not
`passen`, `sich erinnern` is not `erinnern`).

Government lives in two places, neither of them the Lemma:

- On the Attestation, as `governedPrepositionEvidence`: the owned member the
  verb lexically selects, aligned like `expletiveEvidence` (ADR 0022). Intake
  or click-time classification still assembles the preposition into the
  verbal target as a member, so clicking `auf` in `wartet auf den Zug`
  resolves the whole unit to `warten`. Grammar answers which member, if any,
  is governed and may still refuse a unit whose glued preposition is an
  adjunct.
- On the Reading, as Knowledge. The learner-facing fact `warten auf +
  Akkusativ` belongs beside the definition and applies to adjectives like
  `stolz auf` without any schema difference between Kinds.

A German pronominal adverb (`darauf`, `dafür`, `damit`, the `wo(r)-` and
`hier-` compounds) is its own single-member ADV Lexeme (`pronType: Dem` for
`da(r)-` and `hier-` forms, `Int` or `Rel` for `wo(r)-` forms by use), never a
governed member of the governing verb or adjective and never a fixed Phraseme
member with its governor outside a genuine idiom. The government relation
stays on the governor.

Consequences: stored VERB Lemmas that differed only by `hasGovPrep` collapse
into one Lemma, so their Readings merge under the Emoji Description that
already separates senses such as `es geht um` from `gehen`. Adjective
government has no Attestation evidence yet, because intake does not assemble
a governed preposition into an ADJ target; that is a membership question for
intake, not an identity question. A grammatical relation from the governor to
the ADP Lemma under ADR 0019 remains possible and unbuilt.
