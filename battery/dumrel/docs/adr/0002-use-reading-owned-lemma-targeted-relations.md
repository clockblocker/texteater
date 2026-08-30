# Use Reading-owned, Lemma-targeted relations

Dumrel represents Semantic Relations as claims owned by exact Readings, with
Lemmas as the default targets. The finite graph supplied by callers contains
the Reading inventory and direct claims needed for pure inference without
giving Dumrel dictionary or persistence responsibilities.

System ADR 0012 replaced inferred-edge materialization with read-time
projection. System ADR 0016 retained Lemma targeting as the default and added a
homogeneous exact-Reading target mode for reviewed closed inventories.
