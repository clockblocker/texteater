# Testing strategy

The internal in-memory adapter exercises the same storage port and atomic
planned-change protocol expected of production hosts. Tests cover:

- exact Lemma Reading lookup and multiple Readings per Lemma;
- Reading attestation patches and transactional Lemma, Reading, and Surface
  creation;
- Reading identity/aspect validation and empty-Knowledge omission;
- Reading-owned/Lemma-targeted direct writes, direct same-Lemma rejection, and
  graph-wide target conflicts;
- pending creation, exact matching, zero-match and ambiguous retention, and
  atomic cleanup;
- exact-Synonym closure and both-endpoint substitution as inferred views
  without hierarchy transitivity;
- later-Reading inferred views without backfill writes;
- hard-break rejection by absence of a version-0 compatibility interface;
- preservation of encounter translations;
- slice validation, revision conflicts, and rollback after a late operation
  fails with direct and pending-delete changes already staged;
- host-composed plan application that rejects an exclusive host-state conflict
  without publishing either dictionary or host changes.

The generated README example is typechecked and its committed output is tested
byte-for-byte.
