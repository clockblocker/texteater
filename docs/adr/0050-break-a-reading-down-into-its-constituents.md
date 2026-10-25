---
status: accepted
---

# Break a Reading down into its constituents

A resolved unit lets the learner drill down to its parts from its Note
([ADR 0041](./0041-judge-dumling-fields-by-the-learner-and-by-classification.md)).
Dictionaries show two analyses for this, and the model copies both:

- The immediate parts a word or phraseme is built from, one level down, as
  the DWDS Wortzerlegung and the en.wiktionary etymology line show them
  (immediate-constituent analysis, словообразовательный разбор):
  `Kohle + Kraftwerk`, `entspannen + -ung`, `[[Faden|den Faden]] + [[verlieren]]`.
- Every morpheme, flat, as school morphemic analysis shows it (разбор по
  составу, Wortbausteine): `ent · spann · ung · ∅`.

A Reading stores them as one Reading Knowledge aspect, `breakdown: {
constituents, morphemes }`. `breakdown.constituents` holds the Constituents,
decided here. `breakdown.morphemes` holds the Morphemic Breakdown, decided in
[ADR 0051](./0051-copy-school-morphemic-analysis-into-a-readings-morphemes.md).
A formation whose letters can't be cut into pieces has a Source instead of
Constituents (below), a Knowledge aspect of its own outside `breakdown`.

**The Reading owns every Breakdown.** Knowledge belongs to one exact Reading
([ADR 0002](./0002-lemma-is-grammatical-identity-and-reading-is-semantic-identity.md)),
and a split can depend on the sense: `unlockable` 🔑 is `unlock + -able`,
🔓🚫 is `un- + lockable`; `Wachstube` 💂 is `Wach + stube`, 🕯️ is `Wachs +
tube`. A Locution's or Saying's Constituents belong to its Reading too. A
spelling Variant has no Breakdown of its own and shows its Canonical Form's
(`ice-cream` shows `ice cream`'s). A different linking element is a different
formation, not a spelling: `Rinderbraten` and `Rindsbraten` are two Lemmas,
each with a Breakdown, both linking to `Rind`.

**A piece is shown letters and a link.** Each piece pairs the letters it
shows with its target: `[[Kraft|kraft]]`, `[[Schule|Schul]]`. The target is
a Unit Shadow while the part is pending and a Lemma once resolved, never a
Reading. It resolves as a Pending Semantic Relation does
([ADR 0011](./0011-use-reading-owned-lemma-targeted-semantic-relations.md)),
and the Shadow Note shows it until then. Sense lives in the owning Reading's
split, not in the target: the literal and the figurative `Zugkraft` both link
to `Kraft`, and no compound-only sense is authored. A Morpheme piece links
the same way, `-ung` to the Shadow (de, Morpheme, Suffix, `-ung`).

- The shown letters spell the Canonical Form or cited wording back. They
  compare case-insensitively and tolerate umlaut (`[[Gast|Gäst]]`), a dropped
  final -e (`Schul`, `Erd`, `Morgenstund`), a verb stem without its
  infinitive ending (`[[fahren|Fahr]] + [[Rad|rad]]`), a digit for its
  numeral (`3` for NUM `drei`), a reflexive form for the reflexivity unit
  (`dich` for PRON `sich`), a hyphenated Locution part for its spaced
  wording (`Rund-um-die-Uhr` for `rund um die Uhr`) and Hebrew final-letter
  forms. Hyphens, ellipses, gershayim, spaces, punctuation and placeholders
  are unlinked filler segments.
- A Breakdown describes the Canonical Form or cited wording, never an
  occurrence's alignment.
- A piece stores no head or modifier role, no Surface and no Reading. A click
  on `hat` inside a saying's wording already resolves through the click path
  ([Dumgen ADR 0007](../../battery/dumgen/docs/adr/0007-segment-text-into-biggest-units-and-break-multiword-lemmas-down-apart.md)).
- `|`, `+` and grouping are display only. A fused word displays as in running
  text, each component's letters linked to its own target (`i` → `in`, `m` →
  `Pfeffer`). An Interfix may display glued to the part before it
  (`Gäste|haus`).

**Constituents are a word's immediate parts.** Every word built from a word
plus pieces has them: compounds, affixal derivations and particle verbs
alike (`Kohle + Kraftwerk`, `entspannen + -ung`, `ge- + Berg + -e`, `auf- +
machen`). A part is a word where one exists, else a Morpheme: a formant, an
Interfix, or a cranberry piece, which links to its Root Morpheme
(`Himbeere` = `[[him|Him]] + [[Beere|beere]]`), so the morphemes walk stays
unbroken (ADR 0051). There are usually two; a coordinative compound
(`schwarzrotgold`), `Hals-Nasen-Ohren-Arzt` and a parasynthetic `Gebirge` may
have more. Each Note shows one level, and a part's own Constituents are one
click away. A word with no word inside (`spannen`, `receive`) has none.

The rule is structural for every part of speech (`obwohl` = `ob + wohl`), and
links follow form, not meaning. Opaque formations get Constituents
(`bekommen` = `be- + kommen`, `verstehen` = `ver- + stehen`), and no mark
says a formation is opaque.

For German:

- When two bracketings compete, the DWDS Wortzerlegung decides, else the
  en.wiktionary etymology line: `un- + glücklich`, `verarzten` = `ver- +
  Arzt`.
- The citation ending is unlinked filler: `verarzten` = `[[ver-|ver]] +
  [[Arzt|arzt]] + en`. Constituents hold no inflectional piece.
- A linking element is its own piece, linking to an Interfix from the closed
  set s, es, n, en, e, er, ens: `Arbeit + -s- + Amt`, `[[Gast|Gäst]] +
  [[-e-|e]] + [[Haus|haus]]`, `Kind + -er- + Garten`.
- A true particle links to its Prefix Morpheme (`auf-` in `aufmachen`, `aus-`
  in `Ausland`). A closed particle list in dumcorpus decides which, compound
  particles included: `hinaus-` is one piece, and clicking it gives `hin +
  aus`. The adverbs DWDS gives no verbal affix entry are true particles too
  (`dabei`, `gegenüber`, `vorher`, `rückwärts`, `vorwärts`, `zuwider`, …):
  the Amtliches Regelwerk §34(1) names most of them as Verbpartikeln, their
  free form is an adverb, and German writes them attached to the verb. So
  are the rare first parts (`zunichte` in `zunichtemachen`, `zugute`,
  `vorlieb`, `bevor`, `voneinander`) and the clipped forms (`rum`, `draus`,
  `drum`, `drunter`). Other first parts link to their own Lexeme: NOUN
  `Teil` in `teilnehmen`, VERB `kennen` in `kennenlernen`, ADJ `fest`, and
  ADJ `leid` in `leidtun`, as Duden and DWDS class it and as the 2006
  reform's lowercasing shows.
- A loan piece is judged within the text language: listed in Duden, it links
  to the German Lexeme (`Software`, `Update`), else to a German Foreign Lemma
  ([ADR 0045](./0045-give-foreign-material-a-foreign-family-and-retire-lexeme-x.md)).
  No piece links to another language's Lemma, so a loan blended abroad has
  no Constituents (`Motel`).
- A blend shows truncated letters (`brunch` = `[[breakfast|br]] +
  [[lunch|unch]]`). A part may be PROPN (`Goethe + Straße`, `Berlin + -er`).
- Hyphenated compounds follow DWDS: `Mund-zu-Mund-Beatmung` and
  `3-Zimmer-Wohnung` are flat, and `Vitamin-C-Mangel` = `[Vitamin C] +
  Mangel`. In `E-Mail`, `E` links to DWDS's prefix `e-` (2e-, short for
  *elektronisch*), the hyphen is filler, and `Mail` links to its Lexeme:
  `[[e-|E]]` + `-` + `[[Mail]]`.
- A phrasal compound with no DWDS split and no stored inner unit is flat,
  every word a part: `Trimm-dich-Pfad` = `trimmen · sich · Pfad`, as DWDS
  also splits it. When its front phrase is a real Locution, it stays two
  parts: `[rund um die Uhr] + Betreuung`.

**Satellites come from model data.** A Lexeme's reflexive, governed
preposition, article and auxiliary are read from model data (ADR 0041) and
are never Constituents. The judges agreed on this for the reflexive on
[#1241](https://github.com/clockblocker/texteater/issues/1241#issuecomment-6393717905).
Its other words are: `Frankfurt am Main` = `Frankfurt · am · Main`. A
reflexive is in no Canonical Form
([ADR 0052](./0052-record-a-lexical-reflexive-on-the-reading-never-in-the-canonical-form.md)),
so a reflexive Reading's Breakdown is its word's: `anschließen` 🪞 'join' is
`an- + schließen`, as DWDS splits it, and the Note shows `sich` from the
Reading's Reflexive Slot. `erinnern` has no Constituents and the
morphemes `er · inner · n` (ADR 0051), since its base `innern` is Middle
High German and has no modern headword (the user, 2026-10-25). A
separable particle is a constituent, as above. English phrasal verbs work as
German particle verbs do: `give up` = `give + up`, still one Lexeme VERB
([ADR 0039](./0039-split-phrasemes-into-locutions-and-sayings.md)). The
closed English particle list lives in dumcorpus, and English VERB `phrasal`
need not name its particle, since the constituent link does. The particle
links to its Lexeme, `up` (ADV) in `give up` and `take up`: English writes it
as a separate word that can move (`give it up`), so it is a word, and no
Morpheme Kind is added for it. German keeps the Prefix Morpheme, since it
writes the particle attached (`aufgeben`). Either way the particle verb
joins its base verb's Formations and the particle is one click away.

**A phraseme's Constituents are the biggest units strictly inside its
wording**, as `segment.inUnits` finds them one level down. A part may be a
Locution: `wie zu Hause fühlen`, printed `sich wie zu Hause fühlen`, =
`wie · [zu Hause] · [[fühlen]]`, and `zu Hause` breaks down into `zu +
[[Haus|Hause]]`. An article is grouped
with its noun
([ADR 0040](./0040-make-the-article-a-satellite-of-its-phrase-head.md)):
`[[Faden|den Faden]] + [[verlieren]]`. Fused words split by component.

- Placeholders (`jdm.`, `etwas`) are never parts. Negation is a part.
- A lexical reflexive is no part. It fills the Reading's Reflexive Slot and
  is in no Locution's wording (ADR 0052). A verb inside the wording links to
  its Lemma, whatever Reading it has there: `fühlen` in `wie zu Hause fühlen`
  links to `fühlen`, whose 🪞 Reading DWDS gives as ⟨sich fühlen⟩. A Saying's
  wording keeps its `sich`. There a lexical reflexive is grouped with its
  verb, both pieces linking to the verb's Lemma, and a free one is a PRON
  part of its own, linking to the unit that explains reflexivity.
- A word found only in idioms is a Lexeme if Duden or DWDS has a headword for
  it (`gäbe`), else unlinked filler.
- An optional word in the Canonical Form is a part like any other (`genäht`
  in `Doppelt genäht hält besser`).
- An optional intensifier stays out of the Canonical Form, so it is never a
  part: `aus dem Häuschen sein`, not `(ganz) aus dem Häuschen sein`. Where
  `ganz` occurs, Rule `de/modification-attests-partially` handles it.

**A Source names an unsegmentable formation's base.** It points one step
back, at the immediate base, as ru.wiktionary, DWDS and en.wiktionary do:

- conversion: `Lauf` ← `laufen`, and a verbal noun with no suffix,
  `Ausgang` ← `ausgehen`, `Aufgabe` ← `aufgeben`
- participle: `gesungen` ← `singen`
  ([ADR 0036](./0036-make-adjectival-german-participles-adj-linked-to-their-verb.md))
- acronym: `Kita` ← `Kindertagesstätte`
- clipping: `Uni` ← `Universität`, so `Unibibliothek` = `Uni + Bibliothek`

A Source has one target, which links as a piece does. It records the
formation, not how obvious the formation still is: `Band` 🎀 'ribbon' and
`Band` 📚 'volume' both have the Source `binden`, as DWDS derives both. A
blend takes
Constituents instead. An affixal derivation has no Source, because its base
is its word part (`Aufmachung` = `aufmachen + -ung`). The Reading Knowledge
aspect `source` replaces `participleSource`.

Knowledge Production produces every Source, on a single-word NOUN, VERB or
ADJ Reading. First jev judges the formation: a participle (ADJ only), a
conversion, a clipping, an acronym or none. A participle's verb comes as
ADR 0036 says. For any other formation, Luna writes the base and code
checks its letters by type: a conversion changes the Kind and adds no
listed affix, and a clipping or acronym keeps the Kind and shows the
base's letters in order. Then jev confirms, choosing a conversion's
direction among both (`Lauf` from `laufen`, not the reverse). The type is
not stored, since nothing reads it.

The host asks for `source` before the segmenters. A Reading with a Source
runs neither segmenter. Any other runs `segment.inConstituents`, and when
that finds none, the Reading is a bottom word and `segment.inMorphemes`
splits it (ADR 0051). A failed or Unresolved `source` holds both
segmenters. A clipping or acronym whose base doesn't pass is Unresolved,
not none, so no split is invented for `Kita`. A conversion that doesn't
pass counts as none, since splitting `Lauf` as a bottom word shows the
same `lauf · ∅`. The host also rejects a Source whose base's own stored
Source points back at the word (`Fisch` ← `fischen` while `fischen` ←
`Fisch`): the first stored direction wins, and the rejected Source counts
as none. The judges agreed on this on
[#1241](https://github.com/clockblocker/texteater/issues/1241#issuecomment-6361530506).

**Formations list the words built on a word.** A word's Note lists every
stored word whose Constituents link to it, grouped by the Kind of the other
piece: prefixed verbs, compounds, derivations. The `kaufen` Note lists
`einkaufen`, `verkaufen` and `abkaufen`; the `take` Note lists `take up` and
`take down`. The list is computed from the links, never stored, and grows only
from words the learner has met. While the base is a pending Shadow, the Shadow
Note carries them, and resolution moves them to the Lemma. It copies the DWDS
word-formation panel. The name Formations is provisional.

**Who produces them.** `segment.inConstituents` produces the Constituents
once per Reading that has no Source (Dumgen ADR 0007), and Knowledge
Production produces the Source (above). An authored closed-class member carries
authored Breakdowns
([ADR 0021](./0021-close-routes-in-dumgen-and-author-closed-class-inventories-in-dumcorpus.md)):
the reciprocal pronominal adverbs link their preposition to the ADP (`mit` in
`miteinander`), and `einander` = `ein + ander`. A Breakdown Record in
dumcorpus is gold for one Reading, a phraseme's or a single word's. It
points at its owning Reading and holds that Reading's `breakdown` or
`source` as dumrel stores them: a phraseme's or a word's Constituents,
`segment.inConstituents` gold; a bottom word's morphemes,
`segment.inMorphemes` gold; or a Source. Its parts have no Surface or
Reading, and its check enforces this ADR's and ADR 0051's invariants.

**Scope.** German is built first. Russian is deferred, and its examples here
only illustrate. English follows the rules above when it is built. No
decision excludes Hebrew: a construct chain is `[בית ספר] + תיכון`, and root
and pattern authoring belongs to the Hebrew owner
([#1246](https://github.com/clockblocker/texteater/issues/1246)).

The user ruled the cranberry piece, `E-Mail`, phrasal compounds, optional
intensifiers, the English particle, the particle list and `leid` on
[#1241](https://github.com/clockblocker/texteater/issues/1241) on
2026-10-24.

## Considered Options

- The Lemma owns a phraseme's Breakdown, produced once per Lemma. Rejected:
  splits depend on the sense, and Knowledge belongs to a Reading.
- Parts link to Readings, or to a Reading where one fits. Rejected: it needs
  compound-only senses and Readings for parts nobody met, while the owning
  Reading's split already carries the sense.
- A stored tree of parts. Rejected: it repeats each part's own Breakdown and
  could contradict it.
- Breakdowns per occurrence. Rejected: two sentences with one idiom would
  repeat it and could disagree.
- A flat phraseme Breakdown (`den + Faden`). Rejected: `m` would link to DET
  `dem`, which ADR 0040 rules out.
- Lexeme parts only in a phraseme. Rejected: `zu Hause` is one unit.
- The plural-looking Fuge as one piece, `[[Gast|Gäste]]`. Rejected: one rule
  covers every Fuge, and school Wortbausteine mark the Fugenelement.
- The citation ending as a linked Ending piece in Constituents. Rejected:
  nearly every German verb would link to one `-en`, filling its Formations
  with noise, and the ending reflects the citation convention, not how the
  word was built. `ver-…-en` as one discontinuous formant was rejected too.
- An opacity mark. Rejected: no consumer, it is graded, it can't be checked,
  and Formations list opaque formations by form anyway.
- No breakdown unless a piece's Reading contributes to the meaning (`receive`
  gets none). Rejected: a link names a Lemma, so it can't say which Reading
  contributes.
- An unlinked cranberry piece in the Constituents (`Him + Beere`). Rejected:
  the morphemes walk would break at it, and the Morphemic Breakdown links
  the same piece to its Root anyway.
- `E` in `E-Mail` as unlinked filler. Rejected: DWDS's Wortzerlegung links
  it to the prefix 2e-.
- A phrasal compound as modifier + head when nothing inside it is stored.
  Rejected: no stored unit says where the modifier ends, and DWDS splits
  `Trimm-dich-Pfad` flat.
- An optional intensifier as a part linking to ADV `ganz`. Rejected: it is
  ordinary modification, not part of the citation form.
- A new Morpheme Kind `Particle` for the English particle. Rejected: English
  writes the particle as a separate, movable word, which makes it a Lexeme.
- The adverbs with no DWDS verbal affix entry linking to their ADV Lexeme.
  Rejected: the Regelwerk names them as Verbpartikeln, and German writes
  them attached.
- Adding the rare first parts on demand. Rejected: listing them now moves
  nothing, since Dumgen opens no slot on them until a lab round weighs one.
- `leid` linking to NOUN `Leid`. Rejected: Duden and DWDS class it as an
  adjective, and the 2006 reform lowercased it.
- A Source with two targets for a blend. Rejected: a blend's letters can be
  cut.
- `segment.inConstituents` returning a Source, with the base picked by jev
  among bases code writes from the letters. Rejected: code can't write the
  base of a clipping, an acronym or `Gang` ← `gehen`. Those words would be
  split as bottom words (`kit · a`), and the participle's Source would
  have a second producer.
- `segment.inConstituents` deciding that a word has a Source, and Knowledge
  writing the base. Rejected: whether `source` is requested would then
  depend on a segmenter's answer, not on the route; a participle could get
  both a Source and Constituents (`gekocht` as `ge- + kochen`); and a base
  Luna can't write would leave the Reading with neither.

## Consequences

- Amends ADR 0006, ADR 0036, ADR 0039 and ADR 0041.
- Dumrel's `morphologicalTree` and `participleSource` give way to `breakdown`
  and `source`, with no compatibility path. tf-demo's Shadows parsing, the
  `MorphologicalTree` layout block and its settings toggle go with them.
- The Breakdown Record check accepts Locution targets and an owning Reading;
  its 15 Draft records are re-authored without Surfaces or Readings.
- dumcorpus holds the closed German particle list and the Interfix set, and
  per language a policy saying which formation steps are constituent steps
  (ADR 0051).
