---
status: accepted
---

# Split a German word as its dictionary does

[ADR 0050](./0050-break-a-reading-down-into-its-constituents.md) gives a
Reading its Constituents, a word's immediate parts. German follows its
dictionaries in deciding them, and in naming the part of speech of the
Reading a Breakdown Record owns:

- The dictionary decides whether a word splits and how, however opaque it
  now is: the DWDS Wortzerlegung, else the en.wiktionary etymology line,
  else no split (the user, 2026-10-27): `verarzten` = `ver- + Arzt`
  (DWDS), `Gewissen` = `ge- + wissen` (en.wiktionary), and `Gefahr`, split
  by neither, has none.
- A Breakdown Record's Reading's Kind follows the dictionary, as every gold
  Reading's does ([ADR 0036](./0036-make-adjectival-german-participles-adj-linked-to-their-verb.md)).
- The citation ending is unlinked filler: `verarzten` = `[[ver-|ver]] +
  [[Arzt|arzt]] + en`. Constituents hold no inflectional piece.
- The adverbial suffix -s is its own piece, linking to the Suffix `-s`, which
  is neither the Interfix -s- nor the genitive ending: `nachmittags` =
  `Nachmittag + -s`, `anfangs` = `Anfang + -s`, `bereits` = `bereit + -s`.
  DWDS gives these adverbs no Wortzerlegung and has no affix entry for -s,
  but en.wiktionary splits them with its -s (adverb), and that is enough for
  the affix test too ([ADR 0051](./0051-copy-school-morphemic-analysis-into-a-readings-morphemes.md);
  the user, 2026-10-29). It is cut from adverbs only. A word neither
  dictionary splits stays a bottom word: `anders`.
- A linking element is its own piece, linking to an Interfix from the closed
  set s, es, n, en, e, er, ens: `Arbeit + -s- + Amt`, `[[Gast|Gäst]] +
  [[-e-|e]] + [[Haus|haus]]`, `Kind + -er- + Garten`.
- In a verb, a true particle links to its Prefix Morpheme (`auf-` in
  `aufmachen`). A closed particle list in dumcorpus decides which, compound
  particles included: `hinaus-` is one piece, and clicking it gives `hin +
  aus`. The adverbs DWDS gives no verbal affix entry are true particles too
  (`dabei`, `gegenüber`, `vorher`, `rückwärts`, `vorwärts`, `zuwider`, …).
  So are the rare first parts (`zunichte` in `zunichtemachen`, `zugute`,
  `vorlieb`, `bevor`, `voneinander`) and the clipped forms (`rum`, `draus`,
  `drum`, `drunter`). Other first parts link to their own Lexeme: NOUN
  `Teil` in `teilnehmen`, VERB `kennen` in `kennenlernen`, ADJ `fest`, ADJ
  `leid` in `leidtun`. Outside a verb, a particle-like part links to its
  ADP: `aus` in `Ausland`, `über` in `überhaupt` (the user, 2026-10-27).
- A loan piece is judged within the text language: listed in Duden, it links
  to the German Lexeme (`Software`, `Update`), else to a German Foreign Lemma
  ([ADR 0045](./0045-give-foreign-material-a-foreign-family-and-retire-lexeme-x.md)).
  No piece links to another language's Lemma, so a loan blended abroad has
  no Constituents (`Motel`).
- A blend shows truncated letters (`brunch` = `[[breakfast|br]] +
  [[lunch|unch]]`). A part may be PROPN (`Goethe + Straße`, `Berlin + -er`).
  Fontane's fictional `Hohen-Cremmen` = `[[hoch|Hohen]]` + `-` +
  `[[Cremmen]]`, PROPN `Cremmen` its own Lemma, not a Variant of the town
  `Kremmen` (the user, 2026-10-25).
- Hyphenated compounds follow DWDS: `Mund-zu-Mund-Beatmung` and
  `3-Zimmer-Wohnung` are flat, and `Vitamin-C-Mangel` = `[Vitamin C] +
  Mangel`. In `E-Mail`, `E` links to DWDS's prefix `e-` (2e-, short for
  *elektronisch*), the hyphen is filler, and `Mail` links to its Lexeme:
  `[[e-|E]]` + `-` + `[[Mail]]`.
- A phrasal compound with no DWDS split and no stored inner unit is flat,
  every word a part: `Trimm-dich-Pfad` = `trimmen · sich · Pfad`, as DWDS
  also splits it. When its front phrase is a real Locution, it stays two
  parts: `[rund um die Uhr] + Betreuung`.

## Considered Options

- The plural-looking Fuge as one piece, `[[Gast|Gäste]]`. Rejected: one rule
  covers every Fuge, and school Wortbausteine mark the Fugenelement.
- The citation ending as a linked Ending piece in Constituents. Rejected:
  nearly every German verb would link to one `-en`, filling its Formations
  with noise, and the ending reflects the citation convention, not how the
  word was built. `ver-…-en` as one discontinuous formant was rejected too.
- `E` in `E-Mail` as unlinked filler. Rejected: DWDS's Wortzerlegung links
  it to the prefix 2e-.
- A phrasal compound as modifier + head when nothing inside it is stored.
  Rejected: no stored unit says where the modifier ends, and DWDS splits
  `Trimm-dich-Pfad` flat.
- Opaque words as bottom words (`Gewissen`). Rejected: opacity is graded;
  a dictionary split can be checked.
- A gold Reading's Kind by its use alone (`wirklich` as a sentence adverb,
  ADV). Rejected: the two judges split on it, and a dictionary's class can
  be checked.
- `über-` in `überhaupt`. Rejected: nothing outside a verb separates.
- The adverbial -s off the affix list, since DWDS has no affix entry for it.
  Rejected: the split rule already falls back to en.wiktionary, which lists
  the suffix, and an affix test that asked more than the split rule would
  leave `anfangs` split in gold and whole in the segmenter.
- The adverbs with no DWDS verbal affix entry linking to their ADV Lexeme.
  Rejected: the Amtliches Regelwerk §34(1) names most as Verbpartikeln, and
  German writes them attached.
- Adding the rare first parts on demand. Rejected: listing them moves
  nothing until a lab round weighs one.
- `leid` linking to NOUN `Leid`. Rejected: Duden and DWDS class it as an
  adjective, and the 2006 reform lowercased it.
