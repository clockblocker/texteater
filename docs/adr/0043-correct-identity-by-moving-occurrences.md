---
status: accepted
---

# Correct identity by moving occurrences

Several decided steps make guesses that become identity:

- segmentation picks each unit's route ([Dumgen ADR 0007](../../battery/dumgen/docs/adr/0007-segment-text-into-biggest-units-and-break-multiword-lemmas-down-apart.md));
- a referent-ambiguous pronoun falls back to its most probable cell
  ([#606](https://github.com/clockblocker/texteater/issues/606));
- the judge decides Reuse or NoMatch on Emoji Descriptions
  ([ADR 0031](./0031-resolve-readings-through-the-emoji-description-alone.md)).

ADR 0031 records that a wrong Reuse stores two senses under one Reading, a
wrong NoMatch stores one sense twice, and nothing can undo either. Each of
these errors is one occurrence pointing at the wrong unit.

**Correct moves an occurrence.** An Attestation can be moved to another Lemma
or Reading, an existing one or a new one. Moving one occurrence of a Reading
to a new Reading splits it, and moving it to another existing Reading
relabels it. Moving every occurrence of one Reading onto another merges them.
A Reading or Lemma left with no Attestations is removed with its Knowledge; a
Reading that receives occurrences keeps its own Knowledge. An `Unresolved`
unit is corrected the same way, by giving its occurrence a unit.

No operation edits a Reading's Emoji Description or merges Knowledge, so ADR
0031's identity key stays as it is.

## Considered Options

- Explicit merge and split operations on Readings and Lemmas, with rules for
  combining Knowledge. Rejected: every known error is one misplaced
  occurrence, and moving occurrences already expresses both.
- No correction until a product needs it. Rejected: segmentation, pronoun
  cells and emoji judgments all guess, and a wrong guess would stay identity
  for good.

## Consequences

- Amends ADR 0031's consequence that judge errors persist.
- Dumdict and tf-demo implement the move and the removal of empty units. They
  are rebuilt after the segmentation rewrite
  ([#701](https://github.com/clockblocker/texteater/issues/701)), so the
  implementation waits for it.
- Decided on [#595](https://github.com/clockblocker/texteater/issues/595) from
  the model audit of 2026-09-27.
