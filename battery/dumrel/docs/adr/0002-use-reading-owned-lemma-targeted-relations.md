---
status: accepted
source: "texteater#177"
supersedes: relation clauses of 0001-keep-dumrel-ownerless-and-pure.md
---

# Use Reading-owned, Lemma-targeted relations

Dumrel represents canonical Semantic Relation targets as concrete Dumling
Lemmas inside Reading Knowledge. Pending Semantic Relations remain separate
values containing a relation kind and a Unit Shadow.

The pure propagation interface receives a finite graph with two explicit
parts: the current Reading-to-Lemma ownership inventory and Reading-to-Lemma
edges. This is the minimum information required to derive one-level inverse
fan-out and exact-Synonym closure without teaching Dumrel about dictionary
lookup or persistence.

`propagateRelations` returns inferred edges only. It materializes an inverse
for each supplied direct edge across the supplied current target-Lemma
Readings, then applies exact-Synonym transitivity and two-endpoint substitution.
It does not recursively invert inferred edges. Consequently Near Synonym and
Antonym remain symmetric only, Hypernym/Hyponym and Meronym/Holonym remain
paired one-level inverses only, and no hierarchy transitivity exists.

Dumdict remains responsible for selecting the finite inventory, resolving
Unit Shadows, preserving later-Reading inverse backfill, enforcing owner-aware
same-language and self-edge rules, and choosing whether inferred edges become
stored Reading Knowledge.
