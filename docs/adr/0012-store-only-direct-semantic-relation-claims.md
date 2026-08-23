---
status: accepted
source: "texteater#197"
supersedes:
  - inverse-materialization and later-Reading-backfill clauses of 0011-use-reading-owned-lemma-targeted-semantic-relations.md
  - persistence-choice clause of ../../battery/dumrel/docs/adr/0002-use-reading-owned-lemma-targeted-relations.md
partially-superseded-by: 0016-use-homogeneous-semantic-relation-target-modes.md
---

# Store only direct Semantic Relation claims

ADR 0016 adds a homogeneous exact-Reading target mode beside the default Lemma
mode. Direct-only storage and inferred read projections remain accepted in both
modes.

Durable Semantic Relation storage contains only direct Reading-owned claims in
canonical orientation. The durable kinds are Synonym, Near Synonym, Antonym,
Near Antonym, Hypernym, and Holonym. Hyponym and Meronym remain canonical view
vocabulary but are never durable direct kinds.

Inverse, symmetric, exact-Synonym closure, substitution, and later-Reading
consequences are deterministic read-time projections over the current direct
graph. A projection identifies whether an edge is direct or inferred and is
never accepted as a persistence DTO. Deleting a direct claim therefore removes
all of its inferred consequences without cleanup writes.

Pending Semantic Relations remain direct unresolved Unit-Shadow proposals.
Zero-match and multi-Lemma matches stay pending and produce no inferred edge.

Before accepting an atomic direct batch, dictionary-scoped code checks every
touched source-Reading/target-Lemma pair. An incoming Synonym removes an
existing direct Near Synonym for the same pair. Every other cross-kind
collision rejects the incoming batch. Exact duplicate claims are idempotent.

This is a hard break. tf-demo provides no migration or compatibility path for
materialized inverse, closure, or backfill edges; the bounded demo reset is a
separate promotion prerequisite.
