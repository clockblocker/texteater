---
status: accepted
---

# Type Dumdict payloads at the apply boundary, not in the schema

The Convex schema keeps `v.any()` for every Dumdict payload: the Lemma,
Reading Entry and Surface records, pending relation records, and planned
changes in transit. Typed Convex validators for these payloads blow the
isolate memory budget. Types are instead
enforced where a plan is written. `applyDumdictPlanInTransaction` parses each
change once with Dumdict's `parseAsPlannedChangeOp`, and every step after it
works on the `PlannedChangeOp` union. Dumdict's storage conformance suite
(`dumdict/testing`) then runs the same planned changes through this store and
the in-memory reference store and asserts the same reads, so the two stores
cannot apply a plan differently without a test failing.

## Considered Options

- Typed `v.union` validators for the payload columns and the plan transport
  were rejected for the isolate memory cost above.
- Hand-checking each field inside the apply switch kept the store's types
  loose and diverged from Dumdict's own validation.

## Consequences

- A row read back from a payload column is trusted as Dumdict's type. Only
  parsed changes write these columns, and every Knowledge Change revalidates
  the Knowledge it extends.
- A change the stored state cannot take, such as creating a stored Lemma,
  is a `semanticPreconditionFailed` conflict before any write, as in every
  Dumdict store. tf-demo keeps occurrences and their cleanup in its host
  graph
  ([tf-demo ADR 0001](./0001-persist-occurrence-attestations-by-segment-membership.md)),
  so a change that carries or checks an Attestation Link, or deletes a
  Reading, a Surface or a Lemma, throws before any write. It stores no Lemma
  Paradigm yet, so a Lemma Record that holds one and a `setLemmaParadigm`
  change throw too, until
  [#1232](https://github.com/clockblocker/texteater/issues/1232) migrates it.
