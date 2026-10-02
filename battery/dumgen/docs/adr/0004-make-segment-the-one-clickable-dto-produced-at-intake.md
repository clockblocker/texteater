---
status: accepted
---

# Make Segment the one clickable DTO, produced at intake

A Segment is the thing a learner hovers and clicks. It carries its kind, the
text it shows and the surface it stands for. For most words surface equals
text. Where a source word realizes more than one grammatical component, it
becomes several Segments: `ins Haus` is `in`, `s`, `Haus`, and `im` is `i`
standing for `in` beside `m` standing for `dem`. An abbreviation stays one
Segment whose surface is its expansion. Analysis Targets and Attestation
members are made of Segments.

Amended 2026-10-02 ([#767](https://github.com/clockblocker/texteater/issues/767)):
a Segment's persisted occurrence coordinate is its index in its Sentence's
Segments, and a Segment carries no character offset. Offsets were chosen
because a rule change can re-split a word and shift the indices after it.
A stored Sentence keeps its own Segments, though, so a rule change cannot
shift indices under rows already stored, and every consumer already keys by
index: `segment.inUnits` units, Analysis Target members, dumspec gold and
tf-demo's stored Segments.

Segments are produced at intake. The deterministic, package-free tokenizer
that ADR 0001 named as the Source Segmentation boundary becomes the first
internal step of that production; per-language tables of fusions, clitics and
abbreviations, and for open patterns one bounded TypeSafe Choice, decide where
a word splits. Segmentation stays lossless: the Segments concatenated give the
Stitched Text back.

The persisted occurrence coordinate is the Segment's index in its Sentence's
Segments (amended 2026-10-02).

## Considered Options

- A second layer above raw Segments, a "Piece" span with a linked surface,
  would have kept indices and the deterministic boundary as they are. It was
  rejected because indices were never stable across tokenizer changes either,
  every consumer would carry two coordinates, and the glossary would gain a
  term whose only content is "the Segment, but the clickable one".
- Keeping fusions as one Segment with a `Construction/Fusion` route was the
  prior design. It made `im` a Lemma-bearing unit with no learner meaning and
  could not let `s` in `ins` join the noun. Fusion survives as an occurrence
  value, not a route.

## Consequences

- ADR 0001's boundary sentence is amended: deterministic Source Segmentation
  is an internal pre-pass, and Hebrew word-internal splitting moves from click
  resolution to intake without an analyzer package or a server-only step.
- Attestation member orthography gains `Fused`; a fused article is an owned
  member with Full coverage. A component with no letters of its own leaves its
  unit Partial with evidence pointing at the Fusion value.
- Hosts that persist occurrences, today tf-demo's Attestation Membership and
  click records, key them by Segment index, as they already did (amended
  2026-10-02).
- The Segment parser on the package root changes under ADR 0014's frozen
  interface and is inventoried as a deliberate change.
