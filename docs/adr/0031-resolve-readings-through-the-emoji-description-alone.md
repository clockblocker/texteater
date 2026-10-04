---
status: accepted
---

# Resolve Readings through the Emoji Description alone

A Reading's semantic identity is its Emoji Description (ADR 0002), and
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

Amended on 2026-10-04: the generator writes its description in the same
Luna call as the Canonical Form, after the headword, so a click waits on one
Luna call instead of two in a row. That call may start before jev has judged
the grammar. Most of what the call reads serves the Canonical Form. The
description's one input is the marked sentence, in its own
`emojiDescriptionInput` block, and the prompt tells Luna to rest the
description on that and the Canonical Form it has just written. Every other
input is to be ignored, and so are the Canonical Form instructions. The call
never carries stored Emoji Descriptions or Readings; its Lemma hints carry
Canonical Form and Core Features only. The judge still runs first over the
stored descriptions and never sees the draft. The draft stands only after
NoMatch, or when nothing is stored, and a draft already stored is a Reuse.
Without a usable draft, as on a click resumed from its Grammar checkpoint,
the standalone generation prompt writes the description as before. The
measured click went from about 1.8 s of Luna calls in a row to 1.0–1.8 s.
Decided by the user on 2026-10-04.

No outside sense inventory sets the granularity. Different concepts are
expected to get different descriptions: `Absatz` as paragraph and as shoe heel.
Whether a figurative or metonymic use shares a Reading with its literal use is
left to the generator, within the test below, and may differ from word to
word, because the language itself draws no fixed line there.

Amended on 2026-10-02: a Lemma gets several Readings only when its meanings
are distinct enough that an emoji-generating model would tell them apart from
the sentence. Subtle functional or grammatical nuances of one meaning stay one
Reading, and when in doubt, fold. `noch` 'still' ⏳ and 'in addition' ➕ are
two Readings. `so` of manner and of degree is one Reading, 👉, because no
model would draw that line reliably. The test holds for authored and drafted
Readings as well as generated ones. Decided by the user on 2026-10-02
([#700](https://github.com/clockblocker/texteater/issues/700)).

Amended on 2026-10-02: `so` is one Reading, 🔧, the manner emoji of `wie`.
A demonstrative carries no series marker, so 👉 left it (ADR 0029). Decided
by the user on 2026-10-02
([#595](https://github.com/clockblocker/texteater/issues/595)).

Equality compares normalized descriptions. Dumling's parse drops variation
selectors (U+FE0E, U+FE0F) and skin-tone modifiers, so `🖱️` equals `🖱` and
`🫳🏽` equals `🫳`. Order and ZWJ sequences are kept, because order can carry
meaning: `🏠➡️` is leaving and `➡️🏠` is arriving.

The committing transaction enforces that stored descriptions are offered before
one is generated. A New decision carries the candidates its judge saw. If the
Lemma has gained a Reading with a different description since, the commit
refuses and resolution runs the judge again over the current candidates.

Conventions: see [Emoji Description conventions](../../battery/dumcorpus/docs/reference/emoji-description-conventions.md).

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
- An authored description names the Reading's function and repeats no
  grammar the Lemma or its Surfaces carry (ADR 0044), so every personal
  pronoun is 👈 and every possessive is 🔐. `sein` is not 👨🔐, because a
  picture standing in for grammatical gender claims sex.

Amended by [ADR 0043](./0043-correct-identity-by-moving-occurrences.md): a wrong Reuse or NoMatch is corrected by moving occurrences, so judge errors no longer persist.

Amended by [ADR 0045](./0045-give-foreign-material-a-foreign-family-and-retire-lexeme-x.md): a Foreign Lemma has one Reading and no Emoji Description, so resolution has nothing to judge or generate for it.
