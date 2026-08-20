---
status: accepted
source: "texteater#177"
partially-supersedes: 0002-lemma-is-grammatical-identity-and-reading-is-semantic-identity.md
partially-superseded-by: 0012-store-only-direct-semantic-relation-claims.md
---

# Use Reading-owned, Lemma-targeted Semantic Relations

ADR 0012 supersedes this ADR's inverse-materialization and later-Reading
backfill clauses. Reading ownership and Lemma targeting remain accepted.

A canonical Semantic Relation is Knowledge owned by one exact Reading and
targets one exact Lemma:

```text
Reading(laufen 🏃) --Synonym--> Lemma(rennen)
```

The target Lemma owns no Knowledge. A generated relation initially targets a
Unit Shadow. Dictionary-scoped code resolves that descriptor to a Lemma or
keeps the relation pending; selection of an exact target Reading is a separate
concern.

For every direct edge, the dictionary materializes the inverse relation on
every current Reading owned by the target Lemma, targeting the source
Reading's Lemma. It repeats this backfill when a later Reading is created for
that Lemma. Dumrel supplies the pure inverse and propagation algebra; Dumdict
supplies the dictionary inventory, matching, planning, and atomic writes.

Exact Synonym is symmetric, transitive, and substitutes at both endpoints of
other relation kinds. Near Synonym and Antonym are symmetric but not
transitive. Hypernym and Hyponym are paired one-level inverses and are not
transitive. Meronym and Holonym are paired one-level inverses and are not
transitive. No hierarchy closure is inferred.

This supersedes ADR 0002 only where it allowed semantic relations between two
Readings. Reading remains semantic identity, Lemma remains grammatical
identity, and Reading equality remains unchanged.
