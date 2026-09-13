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
German language and the source Family, then validates the complete proposal
against Dumrel's contract. A Kind outside that Family fails as invalid model
output. This keeps route choice and Family outside model judgment and prevents
a partially valid response from masquerading as a fully validated result.
The replacement records the original exchange for diagnosis; the retained
prototype evaluator still reports invalid target Kinds in its scores.

A combined route was rejected because it asks one prompt to serve four
different applicability contracts. A model-selected Family was rejected
because it can contradict the already resolved source Lemma. The split costs
four Prompt Sources and corpora, with shared scaffold text limiting drift.

System ADR 0020 owns the same-Family Semantic Relation rule. This ADR owns how
Dumgen presents and enforces that rule at the model boundary.
