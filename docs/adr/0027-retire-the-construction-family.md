---
status: accepted
---

# Retire the Construction Family

Construction is retired as a Family. Its only Kind, Fusion, named a fused
source word such as `im` as a Lemma-bearing unit with no learner meaning.
Under Dumgen ADR 0004 a fused word is several Segments, each standing for its
own surface, and the fusion survives as
Fusion: a coordinate-free occurrence value with the spelling and its ordered
components, listed once on the Segmented Sentence. An Attestation member
realized by a piece of a fused word carries the orthography Fused. Nothing
targets a Fusion with Knowledge or relations.

This ADR also said that every Kind belongs to exactly one Family, so a value
carrying a Kind carried its Family by inference. ADR 0039 reversed that: a
route is `language/Family/Kind`, a Kind name may repeat across Families
(Lexeme VERB, Locution VERB), and a value names its Family explicitly.
Retiring Construction and keeping Fusion as an occurrence value still stand.

## Consequences

- `Construction/Fusion` leaves the classification route inventory and the
  generated grammar schemas; the Dumling `Family` enumeration loses
  `Construction`.
- tf-demo's Unit Reading is a Reading whose Lemma Family is not
  Construction.
- Existing Attestations that pointed at a Fusion Lemma migrate to Fused
  members with evidence pointing at the Fusion value; that migration belongs
  to the segmentation rewrite of Dumgen ADR 0007.

Ruled on
[Piece production for fused words](https://github.com/clockblocker/texteater/issues/492)
and confirmed on
[the Sentence DTO decision](https://github.com/clockblocker/texteater/issues/493).

Amended on 2026-09-25 by [ADR 0035](./0035-attest-articles-and-fused-words-segment-by-segment.md):
a `Fused` member carries its Fusion and component index, a standalone
shortened spelling is `Shorthand`, and Clitic is retired as a Morpheme Kind.
