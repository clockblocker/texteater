---
status: accepted
source: "texteater#235"
partially-supersedes:
  - 0011-use-reading-owned-lemma-targeted-semantic-relations.md
  - ../../battery/dumrel/docs/adr/0002-use-reading-owned-lemma-targeted-relations.md
---

# Use homogeneous Semantic Relation target modes

Each Reading Knowledge value chooses one Semantic Relation target mode. It may
target Lemmas or exact Readings, but it cannot mix the two.

Lemma Target Mode is the default. Open classes and every route without an
explicit reviewed policy use it. Its serialized form remains the existing
relation buckets; `targetKind: "lemma"` is optional.

Reading Target Mode is explicit as `targetKind: "reading"`. It is reserved for
hand-maintained closed-route inventories whose members can be reviewed as a
complete set. Reading-targeted direct claims currently support Synonym only.
Their targets are concrete Dumling Readings, so projection never expands one
target to other Readings of the same Lemma.

A graph may contain source Readings using different modes. Inverse and inferred
edges always use the mode declared by their projected source Reading.

The first promoted Reading-targeted sets are the German definite articles
`der`, `die`, and `das`, followed by the `sein` forms `bin`, `bist`, `ist`,
`sind`, `seid`, and `sein`.

Pending Semantic Relations continue to resolve to Lemmas and therefore belong
to the default Lemma Target Mode. A closed inventory is authored directly with
exact Reading targets instead of passing through pending Unit Shadows.

Hosts persist one endpoint kind per edge and enforce container homogeneity.
Read projections and navigation preserve the endpoint kind: Lemma targets open
Lemma Route Notes; Reading targets open Unit Reading Notes.
