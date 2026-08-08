# Emoji Description Authoring

Rules for learner-facing Emoji Descriptions produced by Reading Resolution.

## Role

Reading Resolution alone creates Emoji Descriptions. Each description is a
stable semantic label for one learner-owned Reading, not a picture of the
sentence where it appeared.

The Lemma remains visible beside it. The emoji only needs to distinguish that
Lemma's learner-facing Readings.

## Core rule

Use one to four Unicode RGI emoji graphemes. Prefer the shortest sequence that
preserves useful lexical structure; one emoji is the default.

Every emoji must represent meaning that stays stable across attestations. Omit
scenery, participants, tense, and other details from the marked context.

## Direct labels

Simple nouns and adjectives normally get one conventional emoji. Extra emoji
must add stable lexical meaning, not decoration or scene detail.

For example, the bench Reading of `Bank` is `🪑`, not `🪑🌳`. The tree describes
one possible park attestation rather than the stable learner concept.

## Lexically informative sequences

Transparent prefixes, particles, and compound members may get their own emoji
when they add useful meaning.

- Represent the same meaningful component consistently across Readings.
- Do not illustrate opaque or fossilized components mechanically.
- Use no more components than the learner needs to recognize the structure.
- Keep every component stable across contexts.

For `aufstehen`, `⬆️` represents the transparent contribution of `auf-` across
Readings:

```text
ordinary getting up: 🛏️⬆️
uprising or revolt:  ✊⬆️
```

Use a compact sequence when one emoji cannot provide a useful mnemonic for a
phraseme. For example, `mit den Wölfen heulen` may use `🐺🗣️🤝`.

## Stability and evaluation

Existing descriptions are immutable learner history. `Reuse` must copy one
supplied description exactly. Never shorten, normalize, or improve it.

For an expected `New` result, an example's emoji is illustrative. Evaluation
checks that the model returns `New` and that its description is absent from
`existingEmojiDescriptions`. Any valid new description scores equally.
