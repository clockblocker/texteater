---
status: accepted
---

# Split Phrasemes into Locutions and Sayings

The Phraseme Family is retired. Its Kinds sorted multiword Lemmas by three
things that are not grammar: whether the meaning is literal (Idiom,
Collocation), what the phrase does in conversation (DiscourseFormula) and
where it came from (Aphorism, Proverb). A Kind picks its route's inflection
features and Grundform rule, so every Idiom inflected like a verb and *ganz
und gar* could never be Grundform. Kind and Core Features are identity, so a
wobble between Aphorism and Proverb, or a `discourseFormulaRole` of Apology
against none, split one expression into two Lemmas (*bitte schön*).

Two Families replace it, Locution and Saying. A route is `language/Family/Kind`
and that triple is unique. A Kind name may appear in two Families: Lexeme VERB
and Locution VERB are different routes, and a Kind does not imply its Family.

**Lexeme or Locution.** A Lexeme has exactly one Head. Its other members are
satellites: a separable particle, governed preposition, reflexive, expletive,
article, auxiliary or DegreeMarker, the word that marks an analytic
comparative or superlative (`am` in `am liebsten`, `most` in `most
beautiful`; [ADR 0040](./0040-make-the-article-a-satellite-of-its-phrase-head.md)).
A satellite may be part of the Canonical Form (`sich erinnern`, `take off`),
or a Core Feature may record it: the PROPN `Schweiz` has Core `article:
Definite` and owns its `die`. A Lemma with two or more Heads is a Locution. A
proper name is one Lexeme whatever its length (`Angela Merkel`, `New York`,
`Deutsche Bank`): its words are parts of the name, which UD attaches as
`flat`, not Heads. Head and satellite describe this Family Rule, which
dumcorpus applies. The Attestation records the Family, but no Head and no
Member Role ([ADR 0041](./0041-judge-dumling-fields-by-the-learner-and-by-classification.md)).

At text time a Locution is one unit over its Segments. Its words come out only
in the Note's drill-down: a Locution or Saying has a Breakdown, its wording
segmented into Lexemes that each resolve like a clicked piece (ADR 0041).

A Locution's Kind is the part of speech the whole acts as:

| Kind | Examples |
| --- | --- |
| VERB | `den Faden verlieren`, `ins Gras beißen`, `eine Entscheidung treffen`, `geltend machen` |
| NOUN | `weißer Rabe`, `blinder Passagier` |
| DET, PRON | `was für ein`, `so ein` |
| ADJ | `fix und fertig` |
| ADV | `zum Teil`, `vor allem`, `ganz und gar`, `zu Hause`, `unter vier Augen`, `auf keinen Fall` |
| ADP | `in Bezug auf`, and circumpositions: `von … an`, `um … willen` |
| CCONJ, SCONJ | `entweder … oder`; `ohne dass`, `als ob`, `um … zu`, `je … desto` (its clause is verb-final) |
| NUM | `zwölf bis sechzehn`, `vier Komma neun` |
| INTJ | `herzlichen Dank`, `guten Morgen`, `wie geht's` |

Its route borrows the inflection features and Grundform rule of the Lexeme
route with the same Kind, narrowed to what a Locution varies. VERB and NOUN
Locutions inflect (`Er hat den Faden verloren`; `unter weißen Raben`), and a
NOUN Locution has Core gender so a host can show its article. DET and PRON use
the closed-class rule. Every other Kind is invariant, and its spelling is its
Grundform.

A Locution ADP's Attestation records the case its complement took, as a
Lexeme ADP's does
([ADR 0034](./0034-store-valency-as-e-valbu-frames-on-the-reading.md)): at
most one bare-case slot, with no member. `um des Friedens willen` records Gen,
and `von da an` records none, since `da` shows no case. It records no
position, since its words are its Canonical Form, and dumcorpus's ADP Case
Table gives it one case set.

**Subordinators with `dass`.** A preposition that joins `dass` into one
subordinator (`ohne dass`, `statt dass`, `anstatt dass`) makes one Locution
SCONJ. The `statt` and `anstatt` forms are separate Lemmas, related as
synonyms, as `je … desto` and `je … umso` are. Adjacent `so dass` is not a
Locution: it is Duden's other spelling of the Lexeme SCONJ `sodass`, a
Licensed Variant with two members, as `auf Grund` is of `aufgrund`. Split
around a word, `so … dass` is a correlator Locution. dumcorpus lists this
family and the zu-infinitive one (`um … zu`, `ohne … zu`, `statt … zu`,
`anstatt … zu`), and its Rules cite the list instead of naming its members
inline. A German ADP never takes `extPos: SCONJ`: `anstatt dass` is not the
ADP `anstatt` used as a subordinator, so Dumling's German ADP schema has no
such value.

**Collocation.** A Collocation is a Locution whose verb only supports its noun
or adjective predicate: `eine Entscheidung treffen`, `Angst haben`, `Kritik
üben`, `geltend machen`. A weak collocation whose meaning is literal
(`starker Raucher`, `Zähne putzen`) is ordinary Lexemes. This one definition
replaces the three that `GLOSSARY.md`, ADR 0034 and dumcorpus held.

**Formulas.** A routine formula is an INTJ: a Lexeme when it is one word
(`danke`, `Entschuldigung!`), a Locution otherwise (`guten Morgen`).
`Entschuldigung!` and the noun `die Entschuldigung` are two Lemmas.
DiscourseFormula is gone. A Canonical Form takes the word's lexical casing
([ADR 0002](./0002-lemma-is-grammatical-identity-and-reading-is-semantic-identity.md)),
so formulas are cited `herzlichen Dank`, `guten Morgen`, `wie geht's` and
`danke`.

INTJ holds true routine formulas only:

- A fixed adverbial keeps Kind ADV even as a standalone reply. `auf keinen
  Fall` (*Gibst du es ihm? – Auf keinen Fall.*) and `wie dem auch sei` are
  Locution ADV with no comparison forms, never INTJ.
- Words that only stand together are compositional and resolve word by word:
  a repeated `danke, danke`, and `nein danke`.
- *tut mir leid* is not a routine formula. It is always the VERB `leidtun`
  over `[tut, leid]`. *mir*, or any other experiencer dative, is a free PRON,
  and a subject *es* or *das* is a PRON of its own: *Es tut mir leid* gives
  `[Es]` PRON `es`. Its Readings follow Duden's senses: 'regret', for an
  apology (*Tut mir leid, das war mein Fehler*) and for sympathy about a
  matter (*Das tut mir leid* on hearing bad news), and 'arouse pity' (*Der
  alte Hund tut mir so leid*).

**Saying.** The Family `Saying` has one Kind, `Saying`: a complete saying, a
Proverb (`Morgenstund hat Gold im Mund`) or a Winged Word, the *geflügeltes
Wort*, a line from a known source that speakers use apart from it (`Sein oder
Nichtsein`, `Ich bin ein Berliner`). A line is a Saying only once speakers
have taken it up, and a Reviewed Spec Record of one cites a reference
collection: Büchmann's *Geflügelte Worte*, Duden's *Zitate und Aussprüche*,
OWID's *Sprichwörterbuch*, or DWDS, which gives many proverbs an entry of
their own. A maxim nobody quotes resolves word by word. The Canonical Form is
written as a sentence, with internal punctuation and no final punctuation
(`Wer rastet, der rostet`), and the Grundform check compares its words only.

**What left identity.** Route-scoped Reading Knowledge aspects hold it. The
Reading stays its Emoji Description
([ADR 0031](./0031-resolve-readings-through-the-emoji-description-alone.md)).

- Locution Type, optional: Idiom (the meaning is not the sum of the words) or
  Collocation. `zum Teil` and `ohne dass` have none.
- Saying Type, Proverb or WingedWord, with an optional attribution.
- Formula Role on INTJ routes: greeting, farewell, thanks, apology, sympathy,
  request and the like.

**Variation.** A Surface may differ from its Locution's Canonical Form in the
articles, number and possessives of the words that do not inflect, when
grammar causes the change and every fixed word is present: `Die Entscheidung
wurde gestern getroffen`, `Sie trafen mehrere Entscheidungen`, `Sie nahm ihren
Hut`. `normalizedSurface` records the wording and no features describe it. A
change of word breaks the Locution (`einen Faden` while sewing). The Canonical
Form is the dictionary's citation form (`eine Entscheidung treffen`, `seinen
Hut nehmen`, `sich den Kopf zerbrechen`), and open slots belong to the Valency
Frame (`auf den Keks gehen` with its dative Slot).

**Modification.** A deliberate change of wording still attests the unit, with
Partial coverage. The kept words are members and the missing ones are the
absent members. A replacing word with a Lemma of its own resolves on its own.
A replacing word with no Lemma of its own joins the changed unit as a member.

- A Saying accepts any modification: `Kaffee oder Tee, das ist hier die Frage`
  attests `Sein oder Nichtsein, das ist hier die Frage` with members `[oder,
  das, ist, hier, die, Frage]`. A shortened proverb works the same way (`Wer
  rastet, rostet`).
- *Doppelt gemoppelt hält besser* is Duden's proverb *doppelt [genäht] hält
  besser* with *gemoppelt* for *genäht*. *gemoppelt* is a rhyme echo of
  *doppelt*, like *gäbe* in *gang und gäbe*, with nothing to resolve to on
  its own. So the line attests the Saying `Doppelt genäht hält besser` over
  `[Doppelt, gemoppelt, hält, besser]`, Partial, and grouping, and so hover,
  covers all four words. No reference collection lists the modified line; the
  Saying it attests must pass the uptake test.
- A Locution accepts only a fixed word expanded into a compound that it heads:
  `Er biss ins Kunstgras` attests `ins Gras beißen` with members `[biss, in,
  s]`, and `Kunstgras` is its own NOUN. The fused article stays with the
  Locution. Any other replacement breaks it (`in den Rasen beißen`).

**Shared and elided words.** A fixed word that serves two Locutions belongs to
the one it stands in, and the other is Partial with no evidence (ADR 0041). A
shared article differs: it still records `Shared` article evidence
([ADR 0035](./0035-attest-articles-and-fused-words-segment-by-segment.md)).

- Gapping: in `Sie traf die Entscheidung, er die Vorbereitungen`, `traf`
  belongs to `eine Entscheidung treffen`, and `Vorbereitungen treffen` is
  `[die, Vorbereitungen]`, Partial.
- Right node raising: in `Sie hat die Pläne zur Kenntnis und die Kritik ernst
  genommen`, `genommen` belongs to `ernst nehmen`, and `zur Kenntnis nehmen`
  is Partial.
- Only a complement left: in `Ich habe Angst vor Hunden, mein Bruder vor
  Katzen`, the second `Angst haben` is `[vor]`, Partial.

A fixed noun carried only by a pronoun (`Morgen treffe ich sie`, after `Hast du
schon eine Entscheidung getroffen?`) is ideally a Partial `eine Entscheidung
treffen` over `[treffe]`: given the sentence alone, resolution asks for more
context, as it does for referent-ambiguous pronouns
([#606](https://github.com/clockblocker/texteater/issues/606)). Resolving
`treffe` as the VERB `treffen` is an accepted fallback when the classifier
cannot see the link.

**Relations.** Lexeme and Locution share one relation space: `ins Gras beißen`
↔ `sterben`, `eine Entscheidung treffen` ↔ `entscheiden`, `zum Teil` ↔
`teilweise`. Sayings relate only to Sayings.

## Considered Options

- Keep the Phraseme Kinds and add a Core `extPos` to Idiom and Collocation.
  Rejected: it fixes the inflection but leaves the Idiom-or-Collocation
  judgment in identity, and one route would need several inflection schemas.
- `Phraseme/Locution` and `Phraseme/Saying`. Rejected: the Kind slot is where
  the part of speech goes.
- Multiword Lexemes for frozen units, as the ADV `zum Teil` was. Rejected:
  "frozen" is a judgment, and the Head count states the same line
  structurally.
- Other names. UD's `fixed` expressions cover only function-word-like units,
  and names are `flat`. MWE, in the NLP literature, includes proverbs and
  particle verbs. Phraseology's "phraseme" covers both new Families, so
  keeping it for one would mislead readers and prompts.
- Proverb and WingedWord as Saying Kinds. Rejected: both are invariant, and a
  classifier torn over `Zeit ist Geld` would split one saying into two Lemmas.
- Saying Type, attribution and Formula Role as Lemma features or a new Lemma
  Knowledge layer. Rejected for now: Reading Knowledge is the existing home,
  and these Lemmas nearly always have one Reading.
- Any modification of a Locution attests it. Rejected: once one of two or
  three words is replaced, a modification looks like a literal use.

## Consequences

- Amends [ADR 0020](./0020-keep-semantic-relations-inside-one-family.md):
  Lexeme and Locution share one relation space. Amends
  [ADR 0027](./0027-retire-the-construction-family.md): a Kind no longer
  implies its Family. Amends
  [ADR 0032](./0032-choose-core-features-per-route-for-the-learner.md),
  [ADR 0034](./0034-store-valency-as-e-valbu-frames-on-the-reading.md) and
  [ADR 0035](./0035-attest-articles-and-fused-words-segment-by-segment.md).
- Dumling drops `PhrasemeKind`, the Phraseme routes and the Core
  `discourseFormulaRole`, and gains Locution and Saying routes. English idioms
  gain verbal inflection (`kicked the bucket`). Hebrew construct compounds
  (`בית ספר`) are Locution/NOUN, pending the Hebrew owner.
- In dumcorpus, the Reviewed Aphorism records return to review, the multiword
  Lexeme records other than names become Locutions, and the phraseme Rules are
  rewritten.
- ADR 0041 decides what an Attestation records about its members. Dumgen's
  segmentation ADRs decide how segmentation produces units and Breakdowns.
