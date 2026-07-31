# Testing strategy

> **Superseded terminology:** This document predates ADR 0002 and is retained
> as pre-refactor design history. Use `battery/dumdict/CONTEXT.md` and the
> generated package README for the current Lemma/Reading model and API.

## Fixture rules

- Linguistic Entries use explicit opaque IDs.
- Meaning IDs are explicit, opaque, non-empty, trimmed, and NFC.
- Meaning content uses `meaningInEmojis`, `descriptionBlocks`, and
  `engTranslation`.
- Surfaces carry their Entry and the settled normalization, spelling, coverage,
  kind, and feature fields.
- Selections use Segmented Sentence IDs plus local Segment indices.

Selection fixtures include multi-segment realizations and noisy clicks. The
`gvae up` fixture, for example, keeps the typo in `attestedSurface`, resolves to
normalized `gave up`, and records both member indices while identity remains the
clicked index.

## Service tests

The internal in-memory adapter exercises the same storage port and semantic
change protocol expected of production hosts. Tests cover:

- exact Entry-ID Meaning lookup
- multiple Meanings per Entry
- Meaning attestation patches
- transactional Entry, Meaning, and Surface creation
- lexical and morphological inverse relations
- pending relation creation, pickup, cleanup, and discard
- slice validation and revision conflicts

The generated README example is typechecked and its committed output is tested
byte-for-byte.
