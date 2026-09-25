---
status: accepted
---

# Attestation supersedes Selection and owns realization coverage

Dumling resolves `Attestation -> Surface -> Lemma`. An Attestation is an
identityless, click-independent occurrence value with ordered attested members,
per-member orthography, realization coverage, and one Surface. Application
coordinates such as sentence IDs, Segment indices, clicks, and marked context
stay outside Dumling. Coverage belongs to the occurrence because discontinuity
or omitted entity-owned material does not change Surface identity.

German noun Attestations may also retain source article orthography as
`articleEvidence`. Shared evidence is not an attested member. A licensed shared
article gives Partial coverage; the same reusable noun Surface can have Full
coverage elsewhere. A governing Fusion can also supply the article with Partial
coverage: `im Wald` attests `[Wald]`, retains `im` as article evidence, and
derives DET Surface `dem` from the grammar of noun Surface `dem Wald`. The expanded article
is not a separately attested word. Sentence coordinates remain application-owned.

Amended on 2026-09-25 by [ADR 0035](./0035-attest-articles-and-fused-words-segment-by-segment.md):
a fused article is an owned `Fused` member of its noun, so `im Wald` attests
`[m, Wald]` with Full coverage. `articleEvidence` remains only for a shared
article.
