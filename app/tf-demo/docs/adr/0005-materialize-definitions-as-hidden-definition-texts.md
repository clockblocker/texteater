---
status: accepted
---

# Materialize definitions as hidden Definition Texts

A Reading's Knowledge definition becomes a Sentence the Visitor can click
like any Sentence in a Text. tf-demo stores it as a hidden Definition Text:
one Text row with a Definition origin, one Sentence, and its Segments, kept
at most once per Reading behind a state row. Segment Selection, Attestation
Membership, Visitor Encounters, and Analysis Stripping all work on it
unchanged, and the Library never lists it. Definition segmentation trusts the
generator's target language and skips intake; it is persisted once and never
recomputed, because a language's segmenter may be a non-deterministic model
call.

A Corrected definition writes a new Definition Text after stripping and
deleting the previous one, and a Retracted definition strips and deletes with
no successor, so ADR 0001's rule that only stripping and reset end
Attestations still holds. The defined Reading is protected from the orphan
pruning that stripping performs, so replacing its own definition never
deletes its Knowledge. Existing definitions receive their Texts through a
one-off migration rather than on demand.

## Considered Options

- A polymorphic Sentence owner or separate definition tables would have
  forced every locator, query, and cleanup path to branch.
- Replacing the Sentence in place on Correct would have broken the
  immutability of committed occurrences.
- Backfilling on first open would have hidden any path that writes a
  definition without segmenting it.

## Consequences

- The Definition block is loaded only when the definition is generated and
  segmented; a permanent segmentation failure shows the bare prose.
- A Source Context from a definition targets the defining Reading Note in
  Sheet form with a Definition focus, never a Text Sheet.
- A Reading's own Definition Text is excluded from its Source Contexts.
- Readings that lose their last source inside a stripped definition are
  pruned like any other orphan, and their own Definition Texts are removed
  without a further cascade.
