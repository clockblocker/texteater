# Project inferences from direct relation claims

Durable Reading Knowledge contains only direct Semantic Relation claims;
inverse, symmetric, Synonym-closure, and substitution edges are deterministic
read-time views with provenance. This makes deletion exact and prevents callers
from feeding inferred graph state back into canonical Knowledge.
