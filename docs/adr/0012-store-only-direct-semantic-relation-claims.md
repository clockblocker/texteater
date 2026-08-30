---
status: accepted
---

# Store only direct Semantic Relation claims

Durable Semantic Relation storage contains only canonical direct claims.
Symmetric, inverse, synonym-closure, substitution, and later-Reading effects
are read-time projections marked as inferred. Removing a direct claim therefore
removes its consequences without cleanup writes, while unresolved Unit Shadow
targets remain pending and produce no inferred edge.
