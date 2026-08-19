---
status: accepted
source: "texteater#169"
partially-supersedes:
  - exact-operation-count clause of 0001-keep-dumrel-ownerless-and-pure.md
  - external-applicability clause of 0001-keep-dumrel-ownerless-and-pure.md
---

# Own German Knowledge applicability and selection

Dumrel owns the pure linguistic decision of which Knowledge leaves apply to a
source-language, Dumling Family, and Dumling Kind route. The first configured
language is German. English and Hebrew remain explicitly unconfigured rather
than inheriting or guessing German policy.

Every German route requests Transcription, a German Definition, and English
Translation. The complete Family/Kind tree additionally selects the Semantic
Relation kinds frozen under issue 167. Morphological Tree and Lexical
Breakdown remain valid Knowledge but are absent from this generation policy.

The policy is authored as one exhaustive German map, fully materialized and
recursively frozen at module initialization. Authoring helpers may express
all relations, exclusions, or explicit selections, but no inheritance or
fallback survives in the exported internal map. Adding a Dumling Family or
Kind therefore requires an explicit policy decision.

Dumrel also defines a complete global Knowledge Settings tree and a sparse
Knowledge Request Mask with `null` at selected leaves. Its public pure
operations return the default applicable mask for an exact Reading and
intersect a request with Settings while pruning empty branches. The empty mask
is valid; `undefined` instead identifies an unconfigured source language.

This decision supersedes only ADR 0001's fixed count of exactly three public
operations and its assignment of all Reading applicability to Dumdict. Dumrel
remains ownerless and performs no generation, fetching, persistence,
dictionary lookup, pending resolution, inverse materialization, or
orchestration. Callers still own same-language, direct-self-edge, storage, and
workflow decisions.
