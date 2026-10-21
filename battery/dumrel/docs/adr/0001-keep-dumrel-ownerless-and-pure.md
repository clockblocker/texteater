---
status: accepted
---

# Keep Dumrel ownerless and pure

Dumrel owns identityless Knowledge values, relation algebra, and pure
transformations over them. Dumling owns foundational Reading identity; Dumdict
owns dictionary scope, persistence planning, matching and workflow; Dumgen owns
model calls. This boundary keeps linguistic contracts independent of their
callers' storage and generation choices.

Dumrel also owns the Knowledge Policy, starting with an explicit German one.
Keeping this pure policy beside the Knowledge it selects makes each route's
selection exhaustive, where a policy spread across the generators would drift
from the Knowledge types. Generation, fetching, persistence and orchestration
stay with callers.

**Dumrel also defines the Lemma Paradigm**
([ADR 0048](../../../../docs/adr/0048-keep-paradigm-variants-on-the-lemma-and-license-them-per-reading.md)):
the value that holds a Lemma's Paradigm Variants and its Readings' Licences,
its Paradigm Changes, the Paradigm Policy that names each route's Variation
Dimensions, and the pure operations over them: licensed variants, Free or
Conditioned, Licence Groups and variant ids. The Paradigm is not Knowledge,
and a Lemma's principal parts are no Reading Knowledge aspect. It stays
ownerless and pure in the same way: Dumdict stores it on the Lemma Record,
and Dumgen writes its Paradigm Changes. The Paradigm Policy sits beside the
Knowledge Policy for the same reason: each route's selection stays next to
the types it selects.

The policy decision was recorded apart as Dumrel ADR 0003 and merged here on
2026-09-28.
