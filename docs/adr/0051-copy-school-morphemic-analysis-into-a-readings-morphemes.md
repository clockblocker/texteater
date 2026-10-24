---
status: accepted
---

# Copy school morphemic analysis into a Reading's morphemes

A Reading's Morphemic Breakdown, `breakdown.morphemes`
([ADR 0050](./0050-break-a-reading-down-into-its-constituents.md)), lists
every morpheme of a word, flat, exactly as school morphemic analysis does
(разбор по составу, Wortbausteine): `ent · spann · ung · ∅`, `при · меч · а ·
тель · н · ость`. Every single-word Lexeme has one (`Haus` = `haus · ∅`).
Morpheme Lemmas and phrasemes have none. Its pieces are shown letters and
links, as in the Constituents: each links to a Morpheme's Unit Shadow or
Lemma, never a Reading.

**The school label is the Morpheme's Kind.** A piece is a Prefix, Root,
Suffix, Interfix or Ending, and the label is the Kind of the Morpheme Lemma
it links to, so no role is stored. A confix is a Prefix or a Suffix by its
position (`Bio · logie`); there is no Confix Kind.

**The Ending is shown.** The Morphemic Breakdown shows the Canonical Form's
ending as an Ending piece, a zero ending included, which is a piece with no
letters: `ent · spann · en`, `haus · ∅`. The Constituents never hold an
inflectional piece and show the citation ending as unlinked filler
(ADR 0050). An indeclinable word has no Ending piece, not even ∅, since a
zero ending marks an empty slot in a paradigm and such a word has none:
`obwohl`, `und`, `miteinander` = `mit · ein · ander`. A verb's `n` after
-el or -er is a Surface of the Ending `-en`, not a Lemma of its own:
`läch · el · n`.

**Morphemes are units like Lexemes.** A Morpheme Lemma has Surfaces and
Readings, as Dumling's Morpheme routes already allow. An allomorph is a
Surface of its Morpheme Lemma, spelled Canonical, not a Variant (a Variant
is a spelling difference): `-keit` and `-igkeit` are Surfaces of `-heit`,
`Gäst` a Surface of the Root `Gast`, `sung` of the Root `sing`, and Russian
`меч` in `примечать` of the Root `мет`. A piece shows the allomorph's letters
and links to the one Lemma. An allomorph is a form its surroundings choose,
as an adjective in -ig takes `igkeit`. Synonyms are separate Lemmas, as `-chen` and
`-lein` are, and so are forms a word picks freely: `-isier` and `-ifizier` are
not Surfaces of `-ier`, since one base can take two with different senses
(`harmonieren`, `harmonisieren`; `elektrisieren`, `elektrifizieren`).

**A Root has a Reading of its own.** It gets a generated Reading with its own
emoji, as Pealim gives a root its own box, never one borrowed from a word: a
bound root has no word to borrow from (`деж` in `одежда`, `ceive` in
`receive`). Homograph roots are separate Readings (`меч` 🗡️ and the root
`мет` 🏷️). A cranberry piece is a Root too, glossed from its etymology where a
dictionary gives one: `Him` in `Himbeere` ← `Hinde` 'hind' (DWDS). The
Constituents link the same piece to the same Root, `[[him|Him]] +
[[Beere|beere]]`, so the walk below stays unbroken (ADR 0050). A Root's
Note can list the stored words built on it (`ceive`: `receive`, `conceive`,
`deceive`, `perceive`). A cranberry needs no flag: its Root lists one word.
Who generates Root Readings is not decided yet; `segment.inUnits` never
routes to a Morpheme, so Dumgen generates none today.

**`segment.inMorphemes` splits only bottom words.** A bottom word has no
word inside it: `spannen` = `spann · en`. The host knows one as a word with
no Source that `segment.inConstituents` finds no Constituents for (ADR
0050). The segmenter splits off only
affixes from the language's closed affix inventory in dumcorpus, and the
remainder is the Root, with a Root Lemma of its own when it is bound:
`ver · gess · en`, `be · ginn · en`, `re · ceive`. An affix split needs two
things: the affix is on the closed affix list, and the DWDS Wortzerlegung
confirms the split. Where DWDS gives no Wortzerlegung, en.wiktionary's
etymology decides, as it does for Constituents (ADR 0050). A fossilized
prefix the test doesn't confirm stays inside the Root, so `Geselle` =
`gesell · e`. The user ruled this on
[#1243](https://github.com/clockblocker/texteater/issues/1243) on
2026-10-24.

**Every other word's morphemes come by propagation.** Code walks up the
Constituents chain. Each step keeps the morphemes it inherits under that
part's shown letters and adds its own formant pieces and its own Ending:

- `spannen` = `spann · en`; `entspannen` = `ent · spann · en`; `Entspannung`
  = `ent · spann · ung · ∅`.
- `Gästehaus` = `[[Gast|Gäst]] + [[-e-|e]] + [[Haus|haus]]` gives `Gäst`
  (the Root `Gast`) · `e` (Interfix) · `haus` (Root) · ∅.
- `Gesellschaft` = `[[Geselle|Gesell]] + [[-schaft|schaft]]` gives `gesell ·
  schaft · ∅`, and `bekommen` = `be- + kommen` gives `be · komm · en`.

A word with a Source instead of Constituents propagates through its Source:
`Lauf` inherits `lauf` from `laufen` and adds its own ∅, and `gesungen`
inherits the Root `sing` through its Surface `sung`. Computing is preferred
over storing copies; the implementation makes the final choice.

A link names a Lemma, never a Reading (ADR 0050), so the walk reads every
stored Reading of a part's Lemma that has a Breakdown or a Source. When
their walked morphemes agree, the part shows them. When they differ, it
shows as one unsplit chunk, as a pending part does, and is never guessed
by storage order. Most Readings of one Lemma share their morphemes, since
morphemes follow form, but `Wachstube` 💂 is `wach · stub · e` and 🕯️
`wachs · tub · e`. The judges agreed on this on
[#1241](https://github.com/clockblocker/texteater/issues/1241#issuecomment-6361530506).

The mechanism is the same for every language. What differs is a
per-language policy in dumcorpus, an inventory or a Rule, that says which
formation steps count as constituent steps; Russian, for one, must decide
whether an aspect pair does.

**A pending part shows as one chunk.** When the walk reaches a part that is
still a pending Shadow, the Note shows that part's shown letters unsplit, and
the chunk fills in once the part's Lemma is stored and broken down. On day 1
the learner meets `Entspannung`, and the Note shows `entspann · ung · ∅`. On
day 5 they meet `entspannen`, and it shows `ent · spann · ung · ∅`. On day 9
they meet `spannen`, and it shows `ent` (Prefix) · `spann` (Root) · `ung`
(Suffix) · ∅. The Constituents are complete from day 1. Nothing is generated
for parts the learner hasn't met, and `segment.inMorphemes` never runs on a
word that isn't a bottom word, so each view has one source.

## Considered Options

- Store the Constituents only and get the morphemes by recursing through
  them to the leaves. Rejected: recursion overshoots on truncated parts
  (`дост` from `достойный`) and on stem alternation (`меч`/`мет`), and needs
  gold for the whole chain. Bottom words get their own split, and
  propagation keeps inherited morphemes under each part's shown letters.
- Generating unmet parts in a cascade. Rejected: extra generations, and it
  fills the dictionary with words the learner hasn't met.
- `segment.inMorphemes` as a fallback on a word that isn't a bottom word.
  Rejected: one view would have two sources that can later contradict each
  other.
- One Morpheme Lemma per allomorph. Rejected: the learner meets one suffix
  in `-heit`, `-keit` and `-igkeit`.
- A Confix Kind. Rejected: school analysis labels a confix by position.
- A Root Reading borrowed from a bottom word. Rejected: bound roots have no
  word.
- Recurrence of the remainder, or prefixal behaviour such as no ge- in the
  participle, as the affix test. Rejected: the dictionary test gives the
  same results on every example, and the Breakdowns already copy DWDS and
  en.wiktionary everywhere else.
- An unlinked cranberry piece in the morphemes. Rejected: a Root with a
  Reading carries what a dictionary says about it, and its Note lists its
  word.

## Consequences

- Dumling gains an Ending Morpheme Kind, which each language picks where it
  applies. A zero ending's Lemma needs a written Canonical Form, because a
  Canonical Form can't be empty; its name is not decided yet. Until it is,
  the code names it `∅`, provisionally, in one constant
  (`zeroEndingCanonicalForm`).
- dumcorpus gains each built language's closed affix inventory and its
  constituent-step policy.
