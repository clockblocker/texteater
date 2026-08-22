---
status: accepted
source: "texteater#223"
---

# Promote operational Closed Routes with observable catalog misses

Every linguistic production route defaults to Open and is promoted explicitly
only after its isolated Closed implementation and reviewed fixed catalog are
operational. Reading promotion implies Lemma promotion, and Reading Knowledge
follows the Reading route rather than introducing a third closure axis.

Promotion does not claim that a catalog can never miss. A `Complete` catalog
claims completeness only for its named scope, while a `Curated` catalog is
deliberately non-exhaustive. Either may back a promoted route. A missing member
returns a structured Catalog Miss that is recorded as catalog-growth evidence;
it never becomes Unresolved and never falls through to the corresponding Open
route.

Fixed Lemmas and Readings remain ordinary Dumling values, fixed Reading
Knowledge remains ordinary ownerless Dumrel Knowledge, and applications load
them idempotently through ordinary Dumdict and persistence plumbing. Route
closure is queried policy, while catalog coverage and operational diagnostics
remain outside entity identity and persistence records.
