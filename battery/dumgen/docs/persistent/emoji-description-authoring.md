# Emoji Description Authoring

Persistent decisions for authoring learner-facing Emoji Descriptions in Dumgen
Reading Resolution prompts and examples.

## Role

Reading Resolution is the sole author of Emoji Descriptions. An Emoji
Description is a stable semantic label for one learner-owned Reading, not a
pictorial transcript of the sentence in which that Reading was encountered.

The Lemma remains visible alongside the Emoji Description. The emoji therefore
does not need to restate the complete lexical meaning; it supplies a memorable
distinction between that Lemma's learner-facing Readings.

## Core rule

Use the shortest emoji sequence that preserves useful lexical structure.

Every emoji in a sequence must represent meaning that remains stable across
attestations of the Reading. Do not encode incidental scenery, participants,
tense, or other details belonging only to the marked context.

## Direct labels

Simple nouns and adjectives should normally receive one direct, conventional
emoji. Additional emoji are not decoration and must not merely make the source
scene more specific.

For example, the bench Reading of `Bank` is `🪑`, not `🪑🌳`. The tree describes
one possible park attestation rather than the stable learner concept.

## Lexically informative sequences

Transparent prefixes, particles, and compound members may receive their own
emoji when they contribute useful meaning to the whole Lemma.

- Represent the same meaningful component consistently across Readings.
- Do not illustrate opaque or fossilized components mechanically.
- Use no more components than the learner needs to recognize the lexical
  structure.
- Keep every component stable across contexts; contextual scenery remains
  excluded.

For `aufstehen`, `⬆️` represents the transparent contribution of `auf-` across
Readings:

```text
ordinary getting up: 🛏️⬆️
uprising or revolt:  ✊⬆️
```

Compact sequences are also appropriate when no single emoji can carry a useful
mnemonic for a phraseme. For example, `mit den Wölfen heulen` may use
`🐺🗣️🤝`.

## Stability and evaluation

An existing Emoji Description is immutable learner history. `Reuse` must copy
one supplied description exactly; Reading identity follows exact membership.
The model must not shorten, normalize, or improve an existing description.

For an expected `New` result, the particular emoji in an example's
`idealOutput` is illustrative rather than authoritative. Evaluation checks only
that the model returns `New` and that its generated Emoji Description is absent
from `existingEmojiDescriptions`. Different valid new descriptions receive the
same score.
