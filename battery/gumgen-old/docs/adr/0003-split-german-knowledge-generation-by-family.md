---
status: accepted
---

# Split German Knowledge generation by Family

German Knowledge generation has one prompt route for each supported Lemma
Family. Dispatch reads the source Lemma's Family. Lexeme and Phraseme routes
may request Semantic Relations; Morpheme and Construction routes remain
base-only because Dumrel's Knowledge Applicability requests no relations for
them.

The model supplies each relation target's Canonical Form and Kind. Dumgen adds
German language and the source Family, filters Kinds outside that Family's
inventory, and reports each removal. This keeps route choice and Family outside
model judgment while preserving nullable requested leaves when every proposal
is removed.

A combined route was rejected because it asks one prompt to serve four
different applicability contracts. A model-selected Family was rejected
because it can contradict the already resolved source Lemma. The split costs
four Prompt Sources and corpora, with shared scaffold text limiting drift.

System ADR 0020 owns the same-Family Semantic Relation rule. This ADR owns how
Dumgen presents and enforces that rule at the model boundary.
