---
status: accepted
---

# Retire the Construction Family

Family is Lexeme, Phraseme or Morpheme. Construction is retired. Its only
Kind, Fusion, named a fused source word such as `im` as a Lemma-bearing unit
with no learner meaning. Under Dumgen ADR 0004 a fused word is several
Segments, each standing for its own surface, and the fusion survives as
Fusion: a coordinate-free occurrence value with the spelling and its ordered
components, listed once on the Segmented Sentence. An Attestation member
realized by a piece of a fused word carries the orthography Fused. Nothing
targets a Fusion with Knowledge or relations.

Every Kind still belongs to exactly one Family, so a value that carries a
Kind carries its Family by inference; Segmented Sentences carry the bare
Kind only.

## Consequences

- `Construction/Fusion` leaves the classification route inventory and the
  generated grammar schemas; the Dumling `Family` enumeration loses
  `Construction`.
- tf-demo's Unit Reading is a Reading whose Lemma Family is Lexeme, Phraseme
  or Morpheme.
- Existing Attestations that pointed at a Fusion Lemma migrate to Fused
  members with evidence pointing at the Fusion value; that migration belongs
  to the production effort of Dumgen ADR 0005.

Ruled on
[Piece production for fused words](https://github.com/clockblocker/texteater/issues/492)
and confirmed on
[the Sentence DTO decision](https://github.com/clockblocker/texteater/issues/493).
