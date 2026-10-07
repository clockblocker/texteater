---
status: accepted
---

# Retire the Construction Family

Construction is not a Family. Its only Kind, Fusion, named a fused source
word such as `im` as a Lemma-bearing unit with no learner meaning. Under
Dumgen ADR 0004 a fused word is several Segments, each standing for its own
surface, and the fusion survives as Fusion: a coordinate-free occurrence
value with the spelling and its ordered components, listed once on the
Segmented Sentence. Nothing targets a Fusion with Knowledge or relations.

An Attestation member realized by a piece of a fused word has the
orthography `Fused` and carries its Fusion and the index of the component it
realizes. A standalone shortened spelling is `Shorthand`, and Clitic is not a
Morpheme Kind.
[ADR 0035](./0035-attest-articles-and-fused-words-segment-by-segment.md)
decides member orthography and how a piece reaches its Fusion.

[ADR 0039](./0039-split-phrasemes-into-locutions-and-sayings.md) decides
routes: a route is `language/Family/Kind`, a Kind name may repeat across
Families (Lexeme VERB, Locution VERB), and a value names its Family
explicitly.

## Consequences

- `Construction/Fusion` is absent from the classification route inventory
  and the generated grammar schemas, and the Dumling `Family` enumeration
  has no `Construction`.

Ruled on
[Piece production for fused words](https://github.com/clockblocker/texteater/issues/492)
and confirmed on
[the Sentence DTO decision](https://github.com/clockblocker/texteater/issues/493).
