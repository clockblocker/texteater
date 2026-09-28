---
status: superseded by ADR-0039
---

# Classify multi-member Lexemes by whole-unit POS

A fixed multi-member Lexeme took one Kind for the whole unit, so German
correlatives and fixed infinitival anchors (`entweder … oder`, `um … zu`) used
their whole-unit POS instead of a mixed `Construction/PairedFrame` route.

[ADR 0039](./0039-split-phrasemes-into-locutions-and-sayings.md) makes them
Locutions, whose Kind is the part of speech the whole acts as, so the
whole-unit POS survives there. The article rule of this ADR (an article and
its noun form one NOUN target; other determiners stay separate) lives in
ADR 0040, and a preposition/article Fusion is no longer a `Construction`
route (ADRs 0027 and 0035).
