# Testing strategy

The internal in-memory adapter exercises the same storage port and atomic
planned-change protocol expected of production hosts. Tests cover:

- exact Lemma Reading lookup and multiple Readings per Lemma;
- Reading attestation patches and transactional Lemma, Reading, and Surface
  creation;
- owner/aspect validation and empty-Knowledge omission;
- forward/inverse Reading Knowledge writes and direct-self rejection;
- pending creation, exact matching, zero-match retention, explicit selection,
  discard, and no automatic fan-out;
- version 0 lexical and shared-ref migration;
- normalized/deduplicated direct target migration and typed duplicate,
  missing, orphan, cross-language, self-edge, and unrepresentable-morphology
  failures;
- preservation of encounter translations;
- slice validation, revision conflicts, and rollback after a late operation
  fails with forward, inverse, and delete changes already staged;
- host-composed plan application that rejects an exclusive host-state conflict
  without publishing either dictionary or host changes.

The generated README example is typechecked and its committed output is tested
byte-for-byte.
