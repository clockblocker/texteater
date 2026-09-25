---
status: accepted
---

# Resolve Readings through the Emoji Description alone

A Reading's semantic identity is its Emoji Description (ADR 0008), and
resolution uses nothing else to tell the Readings of one Lemma apart. The Emoji
Description is an identity label. It is shown beside the Lemma, but that places
no requirement on it: it is not a learner mnemonic.

When a Lemma already has Readings, resolution first offers a judge the stored
Emoji Descriptions as bare emoji, together with the marked sentence. The judge
picks one or answers NoMatch. Only after NoMatch does a generator write a new
description, from the marked sentence and the Canonical Form alone. It never
sees the stored descriptions. If it writes one that is already stored, the
judge was wrong and the decision is Reuse. Both prompts ask the same question,
which emoji describes the target's meaning here, so a matching output is
evidence of the same Reading.

No outside sense inventory sets the granularity. Different concepts are
expected to get different descriptions: `Absatz` as paragraph and as shoe heel.
Whether a figurative or metonymic use shares a Reading with its literal use is
left to the generator and may differ from word to word, because the language
itself draws no fixed line there.

Equality compares normalized descriptions. Dumling's parse drops variation
selectors (U+FE0E, U+FE0F) and skin-tone modifiers, so `🖱️` equals `🖱` and
`🫳🏽` equals `🫳`. Order and ZWJ sequences are kept, because order can carry
meaning: `🏠➡️` is leaving and `➡️🏠` is arriving.

The committing transaction enforces that stored descriptions are offered before
one is generated. A New decision carries the candidates its judge saw. If the
Lemma has gained a Reading with a different description since, the commit
refuses and resolution runs the judge again over the current candidates.

## Considered Options

- An opaque, dictionary-minted Reading identifier with the emoji as an editable
  label and a gloss shown to the judge, as the 2026-09-25 linguistics review
  proposed. Rejected: the emoji as semantic identity is the core of Dumling's
  Reading.
- Showing the generator the stored descriptions so it writes a contrasting one.
  Rejected: it complicates the generation prompt and removes the collision
  that exposes a wrong NoMatch.
- Taking granularity from a dictionary's numbered senses or from translation
  equivalents. Rejected as outside guidance; translation would also make
  identity depend on the reference language.

## Consequences

- Judge errors persist. A wrong NoMatch followed by a different description
  stores one sense twice, and a wrong Reuse stores two senses under one
  Reading. Dumdict has no merge, split or relabel operation for Readings.
- A description that depicts the sentence's scene instead of the target, such
  as `öffnen` 🪟, stays the key, and later occurrences without that scene
  likely get a second Reading. The generation eval guards against this.
- A Fixed Catalog description is judged only on whether it separates the
  Readings of its own Lemma, not on what a learner might read into it.
