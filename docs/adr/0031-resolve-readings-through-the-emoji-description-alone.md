---
status: accepted
---

# Resolve Readings through the Emoji Description alone

A Reading's semantic identity is its Emoji Description (ADR 0002), and
resolution uses nothing else to tell the Readings of one Lemma apart. The Emoji
Description is an identity label. It is shown beside the Lemma, but that places
no requirement on it: it is not a learner mnemonic. A Foreign Lemma has one
Reading and no Emoji Description, so resolution has nothing to judge or
generate for it
([ADR 0045](./0045-give-foreign-material-a-foreign-family-and-retire-lexeme-x.md)).

When a Lemma already has Readings, resolution first offers a judge the stored
Emoji Descriptions as bare emoji, together with the marked sentence. The judge
picks one or answers NoMatch. A new description stands only after NoMatch, or
when nothing is stored. The generator writes it from the marked sentence and
the Canonical Form alone, and never sees the stored descriptions. If it writes
one that is already stored, the judge was wrong and the decision is Reuse.
Both prompts ask the same question, which emoji describes the target's meaning
here, so a matching output is evidence of the same Reading.

**The generator drafts the description in the Canonical Form's Luna call,**
so a click waits on one Luna call instead of two in a row. That call may start
before jev has judged the grammar. Most of what the call reads serves the
Canonical Form. The description's one input is the marked sentence, in its own
`emojiDescriptionInput` block, and the prompt tells Luna to rest the
description on that and the headword, and to ignore every other input and the
Canonical Form instructions. **The description is the answer's first field,
and its input block comes first.** Written after the headword, the draft took
the headword's most common sense: 🏦 for a bench «Bank» in 13 of 40 samples,
and the castle, the rooster and the mother for a lock «Schloss», a tap «Hahn»
and a nut «Mutter». Written first, it named the sentence's sense
([#1165](https://github.com/clockblocker/texteater/issues/1165)). The call
never carries stored Emoji Descriptions or Readings; its Lemma hints carry
Canonical Form and Core Features only. The judge runs first over the stored
descriptions and never sees the draft. Without a usable draft, as on a click
resumed from its Grammar checkpoint, a standalone generation prompt writes the
description. Measured, a click spends 1.0–1.8 s on Luna calls, against about
1.8 s with the two calls in a row.

**A Lemma gets several Readings only when an emoji-generating model would tell
its meanings apart from the sentence.** Subtle functional or grammatical
nuances of one meaning stay one Reading, and when in doubt, fold. `noch`
'still' ⏳ and 'in addition' ➕ are two Readings. `so` of manner and of degree
is one Reading, because no model would draw that line reliably. It is 🔧, the
manner emoji of `wie`, since a demonstrative carries no series marker
(ADR 0029). The test holds for authored and drafted Readings as well as
generated ones. It is the user's ruling on
[#700](https://github.com/clockblocker/texteater/issues/700).

No outside sense inventory sets the granularity. Different concepts are
expected to get different descriptions: `Absatz` as paragraph and as shoe heel.
Whether a figurative or metonymic use shares a Reading with its literal use is
left to the generator, within the test above, and may differ from word to
word, because the language itself draws no fixed line there.

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
  label and a gloss shown to the judge, as a linguistics review proposed.
  Rejected: the emoji as semantic identity is the core of Dumling's Reading.
- Showing the generator the stored descriptions so it writes a contrasting one.
  Rejected: it complicates the generation prompt and removes the collision
  that exposes a wrong NoMatch.
- Taking granularity from a dictionary's numbered senses or from translation
  equivalents. Rejected as outside guidance; translation would also make
  identity depend on the reference language.

## Consequences

- A judge error misplaces occurrences. A wrong NoMatch followed by a different
  description stores one sense twice, and a wrong Reuse stores two senses
  under one Reading. Dumdict has no merge, split or relabel operation for
  Readings; [ADR 0043](./0043-correct-identity-by-moving-occurrences.md)
  corrects either error by moving occurrences.
- A description that depicts the sentence's scene instead of the target, such
  as `öffnen` 🪟, stays the key, and later occurrences without that scene
  likely get a second Reading. The generation eval guards against this.
- An authored description names the Reading's function and repeats no
  grammar the Lemma or its Surfaces carry (ADR 0044), so every personal
  pronoun is 👈 and every possessive is 🔐. `sein` is not 👨🔐, because a
  picture standing in for grammatical gender claims sex.
