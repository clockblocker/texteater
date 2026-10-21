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

A wrong guess misplaces occurrences: a wrong Reuse stores two senses under one
Reading, and a wrong NoMatch stores one sense twice. Each of these errors is
one occurrence pointing at the wrong unit.

**Correct moves an occurrence.** An occurrence's Attestation Link
([ADR 0049](./0049-tabulate-a-lemmas-forms-as-projections.md)) can be moved
to another Lemma or Reading, an existing one or a new one. Moving one
occurrence of a Reading to a new Reading splits it, and moving it to another
existing Reading relabels it. Moving every occurrence of one Reading onto
another merges them. A move to another Lemma takes the Surface resolved for
that Lemma, since a Surface's identity includes its Lemma. An `Unresolved`
unit is corrected the same way, by giving its occurrence a unit.

**What a move or removal leaves behind.** A Reading left with no Attestation
Links is removed with its Knowledge and its Licences, and a Lemma left with
no Readings is removed with its Paradigm and its Surfaces. A Paradigm
Variant that no remaining Reading licenses is removed
([ADR 0048](./0048-keep-paradigm-variants-on-the-lemma-and-license-them-per-reading.md)).
A Surface that loses its last Attestation Link is removed unless it holds
user text (ADR 0049). User text is never dropped, so a Lemma left with no
Readings stays, without a Paradigm, while one of its Surfaces holds some.
The claims other Readings hold on a removed Reading or Lemma move in the
same plan ([ADR 0011](./0011-use-reading-owned-lemma-targeted-semantic-relations.md)).
A Reading that receives occurrences keeps its own Knowledge and
Licences: a move never changes a Licence, and an occurrence whose form its
new Reading doesn't license is flagged as a Licence Conflict.

No operation edits a Reading's Emoji Description or merges Knowledge or
Licences, so ADR 0031's identity key stays as it is.

## Considered Options

- Explicit merge and split operations on Readings and Lemmas, with rules for
  combining Knowledge. Rejected: every known error is one misplaced
  occurrence, and moving occurrences already expresses both.
- No correction until a product needs it. Rejected: segmentation, pronoun
  cells and emoji judgments all guess, and a wrong guess would stay identity
  for good.

## Consequences

- Dumdict plans an occurrence's removal and what it leaves behind
  (`removeOccurrence`). The move
  ([#1233](https://github.com/clockblocker/texteater/issues/1233)) and
  tf-demo's side wait for the segmentation rewrite
  ([#701](https://github.com/clockblocker/texteater/issues/701)).
- Decided on [#595](https://github.com/clockblocker/texteater/issues/595) from
  the model audit of 2026-09-27.
