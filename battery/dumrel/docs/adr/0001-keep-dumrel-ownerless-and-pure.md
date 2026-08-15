---
status: accepted
---

# Keep Dumrel ownerless and pure

Dumrel is an identityless DTO and runtime-schema kernel with exactly three
public operations: applying one Knowledge Change, looking up a Semantic
Relation inverse, and propagating a caller-selected finite relation graph.
Dumdict owns Reading identity, owner applicability, persistence, matching,
resolution, inverse materialization, and housekeeping; Dumgen owns prompts and
model calls. This boundary keeps reusable linguistic contracts independent of
learner storage and generation workflows, at the cost of requiring callers to
perform owner-aware checks such as same-language and direct-self-edge
validation.

## Consequences

Knowledge contains no owner reference, and Pending Semantic Relations are not
canonical Reading Knowledge. Dumrel has no lexical/morphological relation-family
split, owner helper, pending resolver, persistence helper, injected schema
factory, or public per-aspect merge function. Morphological Tree and Lexical
Breakdown remain pointer-only under system ADR 0006.
