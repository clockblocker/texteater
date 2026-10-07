---
status: accepted
---

# Attestation supersedes Selection and owns realization coverage

Dumling resolves `Attestation -> Surface -> Lemma`. An Attestation is an
identityless, click-independent occurrence value with ordered attested members,
per-member orthography, realization coverage, and one Surface. Application
coordinates such as sentence IDs, Segment offsets, clicks, and marked context
stay outside Dumling. Coverage belongs to the occurrence because discontinuity
or omitted entity-owned material does not change Surface identity.

**Members.** Every fixed realized component of a unit is one member, aligned
with its position in the sentence, so a click on any member reaches the same
unit, found by position and never by spelling. Free arguments, modifiers and a
reflexive the verb does not require stay units of their own. A split unit, or
one with free words between its members, is still Full.

**Coverage.** An Attestation is Partial only when fixed material is really
missing from the sentence and the identity is still clear: an article the
Head shares with another Head, a Fusion component with no letters of its own
([ADR 0035](./0035-attest-articles-and-fused-words-segment-by-segment.md)), or
a Locution or Saying with a word left out or changed (ADR 0039). An article is
shared only across coordinated Heads that agree with it. The closest Head owns
it, nearness alone never licenses sharing, and another article or a clause
boundary ends it: in `der Aufstieg und Abstieg`, `Abstieg` is Partial. A
suspended-compound fragment completed by its coordinated compound is Full:
`Ein-` in `Ein- und Ausgang` realizes `Eingang`.

Until ADR 0035, a fused article such as the `m` of `im` stayed outside its
noun as article evidence with Partial coverage. It is now an owned `Fused`
member, and `articleEvidence` names every article of a Head: Owned, Shared or
Hidden ([ADR 0041](./0041-judge-dumling-fields-by-the-learner-and-by-classification.md)).
