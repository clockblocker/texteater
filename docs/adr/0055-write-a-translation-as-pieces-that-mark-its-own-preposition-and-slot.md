---
status: accepted
---

# Write a translation as pieces that mark its own preposition and slot

The heading of `mit zu tun haben` reads `mit jM zu tun haben`, but its
translations read *have to do with* and *иметь отношение*. They don't show
what the equivalent takes: English says *with something*, Russian
*к чему-то*. A learner needs that as much as the German frame.

**A Translation is an ordered, non-empty list of Translation Pieces.** Each
piece has a kind and a text:

- a Preposition is a preposition the equivalent itself governs: `with`,
  `к`;
- a Slot is the placeholder its object fills, in the language's own
  dictionary form, which the model chooses: `something`, `someone`,
  `чему-то`, `кого-то`. Every slot the meaning takes gets one: a plain
  direct object too (*forgive* `someone`, *защищать* `кого-то`), and an
  optional one, with its Preposition, whether or not the sentence uses it
  (*proud* `of` `someone`, *страх* `перед` `чем-то`, *forward*
  `something` `to` `someone`);
- Text is every other word: `have to do`, `иметь отношение`.

*have to do* `with` `something` is three pieces, and an equivalent that
takes no object is one Text piece (`table`). Each piece's text is
normalized as any Knowledge text is.

**A Translation's text is its pieces joined by a space.** Dedupe and
matching compare texts, never pieces. Dumrel keeps the first of two
translations with one text. Accumulation
([ADR 0047](./0047-accumulate-a-readings-translations-click-by-click.md))
compares texts with letter case folded and whitespace collapsed, and jev
sees the stored translations' texts as its options.

**Each translation works out its own valency.** The translation call writes
the pieces from the Reading and the marked Sentence, one call per language,
as before. Nothing pairs a translation's Slots with the German Valency Frame
([ADR 0034](./0034-store-valency-as-e-valbu-frames-on-the-reading.md)): the
languages build the meaning differently (`jemandem danken`: *thank*
`someone`, *благодарить* `кого-то`, an accusative), so a translation names
only its own. The translation calls therefore never wait for the valency
call and keep running beside it. Accumulation's writer writes pieces the
same way.

**The structure is data, and the schema enforces it.** Luna answers through
structured output that asks for the pieces, and Dumrel's schema checks them
on every write. No reader parses marks out of a string. Before a
translation is written, Dumgen relabels a Preposition with no Slot right
after it as a Slot, since Luna labels a case-only object (*радоваться*
`чему-то`) a Preposition.

**A note styles the pieces as the German heading styles its own.** A
Preposition takes the preposition style and a Slot the slot style, the two
styles the German Valency Line uses for its preposition (`mit`, `auf`,
a Locution's Fixed `mit` included) and its slot token (`jM`). Text is
plain.

## Considered Options

- Marks inside the string, such as backticks around `with` and
  `something`. Rejected: every reader would parse them, a stray or
  unbalanced mark would pass as text, and the schema could check nothing.
- Deriving the target language's slots from the German frame. Rejected: the
  constructions differ, as *danken* shows, and the translations would wait
  for the valency call.
- Keeping the string and adding marked character ranges beside it.
  Rejected: the ranges and the string can disagree, and the pieces already
  spell the text.

## Consequences

- The authored closed-class glosses are one Text piece each; none of them
  governs a preposition or takes an object.
- A marking slip shows as a plain word or a wrongly styled one, never as a
  broken note: a missing Slot reads as a shorter equivalent.
- Pieces link nothing. A translation is still text in its language, not a
  relation to a Reading of another language.
