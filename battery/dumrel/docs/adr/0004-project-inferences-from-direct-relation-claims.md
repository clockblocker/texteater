---
status: accepted
source: "texteater#197"
supersedes:
  - storage-choice and materialization language of 0002-use-reading-owned-lemma-targeted-relations.md
---

# Project inferences from direct relation claims

Dumrel distinguishes the six durable direct Semantic Relation kinds from the
complete eight-kind view vocabulary. Its graph input accepts direct claims
only. Its pure graph projection returns deterministic, deduplicated direct and
inferred edges with explicit provenance.

Hyponym and Meronym arise only as inverse views of Hypernym and Holonym.
Symmetric inverses, exact-Synonym closure, and permitted substitution are also
inferred views. Near Antonym has only its symmetric inverse and does not
substitute through Synonyms.

Dumrel remains persistence-agnostic, but no caller may feed inferred
projections back into direct Reading Knowledge. This resolves ADR 0002's open
choice about storing inferred edges in favor of never doing so.
