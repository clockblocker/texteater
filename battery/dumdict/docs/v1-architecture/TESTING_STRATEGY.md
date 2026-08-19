# Testing strategy

The internal in-memory adapter exercises the same storage port and atomic
planned-change protocol expected of production hosts. Tests cover:

- exact Lemma Reading lookup and multiple Readings per Lemma;
- Reading attestation patches and transactional Lemma, Reading, and Surface
  creation;
- Reading identity/aspect validation and empty-Knowledge omission;
- Reading-owned/Lemma-targeted forward and inverse Knowledge writes plus
  direct same-Lemma rejection;
- pending creation, exact matching, zero-match retention, deterministic
  ambiguous forward selection, all-match inverse fan-out, and atomic cleanup;
- exact-Synonym closure and both-endpoint substitution without hierarchy
  transitivity;
- later-Reading inverse backfill from existing incoming Lemma edges;
- hard-break rejection by absence of a version-0 compatibility interface;
- preservation of encounter translations;
- slice validation, revision conflicts, and rollback after a late operation
  fails with forward, inverse, and delete changes already staged;
- host-composed plan application that rejects an exclusive host-state conflict
  without publishing either dictionary or host changes.

The generated README example is typechecked and its committed output is tested
byte-for-byte.
