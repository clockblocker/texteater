---
status: accepted
---

# Give foreign material a Foreign Family and retire Lexeme X

German text quotes other languages all the time: `whatever` in a chat,
`by the way` in an email, `c'est la vie` in a novel. Dumling filed such words
under `Lexeme/X`, UD's tag for material it cannot analyse, together with
gibberish, broken-off words and tokens nobody had classified. The click
classifier had no X route at all, so the same word was X when intake analysed
it and something else, or `Unresolved`, when it was clicked (#622). X was
also the wrong shape. A Lexeme has exactly one Head, but `by the way` has
three words. And X said nothing about what a learner wants from `whatever`:
which language it is, and what it means.

**Foreign is a Family with the one Kind `Foreign`,** as Saying is. The route
is (text language, Foreign, Foreign). The Lemma's `language` is the language
of the text the unit appears in, so `whatever` in a German sentence is a `de`
Lemma. It is not `Lexeme/Foreign`, because a Foreign unit can span several
words.

**Identity is the text language, `sourceLang` and the Canonical Form.** Two
clicks on `whatever` in two German texts reach the same Lemma.

- `sourceLang` is the only Core Feature: the language the unit comes from, as
  a lowercase ISO 639 code of two or three letters (`en`, `fr`, `la`, `yi`,
  `grc`), or `und` when it can't be told. Any language may appear, not only
  the ones Dumling supports, so Dumling checks the code's shape and nothing
  else.
- The Canonical Form normalizes position casing and typos, nothing else.
  Sentence-initial `Whatever` is `whatever`, as for any Lemma (ADR 0002), and
  the typo `watevr` is `whatever` with a Typo member. Nothing is lemmatized
  (`shoes` stays `shoes`), and a variant spelling is not normalized either
  (`colour` stays `colour`). Knowing the source language's morphology and
  spelling standards would take a model of that language, which Dumling does
  not have.
- A Foreign Lemma has one Surface, its Canonical Form, spelled Canonical, with
  no inflectional or Surface features.

**A Foreign Lemma has exactly one Reading, with no Emoji Description.** The
Lemma alone identifies it. This is the one exception to ADR 0002, where a
Reading is one Lemma plus one Emoji Description. Splitting `whatever` into
senses would mean judging the grammar and meaning of a language the text is
not in; the learner is better served by one entry whose Translation lists
every sense. The Reading value simply has no `emojiDescription` field.

**Knowledge is translations only.** The Knowledge Policy for Foreign requests
`translations` and nothing else: no definition, transcription, Semantic
Relations, Valency Frame or inflection class. A translation into the source
language itself is a gloss (`tbh`: en "to be honest"). Every enabled
translation language is kept.

**Loan or Foreign is decided by the dictionary first, then by grammar.** A
word from another language that the text language's dictionary lists in this
meaning is a native Lexeme of its real Kind, whether or not this occurrence
inflects. For German the dictionary is Duden: `das ist cool` gives ADJ `cool`,
`ziemlich cringe` ADJ `cringe`, and `mit lol` INTJ `lol`. A word the
dictionary does not list is a Lexeme only when this occurrence shows the text
language's grammar on it: an ending (`geyeetet` → VERB `yeeten`) or an
agreeing article or determiner (`der Hotfix`). Otherwise it is Foreign: `sehr
sus` gives Foreign `en`. Filling a slot in the sentence does not count as
grammar, since any word can fill one. So a listed word is a Lexeme in every
sentence, and an unlisted one can be a Lexeme in one sentence and Foreign in
the next. dumcorpus states this as a Rule (ADR 0037).

Amended on 2026-09-29: the test was grammar alone. It could never make a word
that does not inflect a Lexeme, so interjections and indeclinable adjectives
came out Foreign even where Duden lists them as German (`lol`, `cringe`).
Decided on [#729](https://github.com/clockblocker/texteater/issues/729).

**A Foreign unit is one word or a lexicalized chunk.** A phrase fixed in its
source language is one unit: `by the way`, `c'est la vie`, `off-grid`. Free
syntax in the other language is split: `very good` is `very` and `good`, and
`I don't know what you mean` gives one unit per word. There is no Fusion
inside a Foreign unit: `don't` is one Foreign member, because a Fusion's
components are words with a Lexeme Kind (ADR 0035).

**`Lexeme/X` is retired in German, English and Hebrew,** and `X` leaves the
part-of-speech list. What it held goes elsewhere:

- foreign material → Foreign;
- nonce words and gibberish (`glorpen`, `Zorp`, `quend`) and truncations
  (`trans…`, `unver…`) → `Unresolved`, a No Target entry in dumcorpus;
- odd tokens → their real Kind (`3D` is an ADJ, as in `3D-Drucker`; `w00t` is
  Foreign `en`);
- loans → their real Kind, by the dictionary-then-grammar test above;
- foreign names → PROPN as before (`New York`, `The Beatles`).

**No Lexeme is marked foreign.** The UD `foreign` feature leaves every Lexeme
route that carried it (German ADJ, ADP, ADV, DET, NUM, PART, PRON, PROPN and
SYM, English NOUN and INTJ) and Dumling's feature catalog. The test above
already sorts every word into a Lexeme of the text language or a Foreign
Lemma, so a flag on the Lexeme would mark the same thing twice. It was also a
Core Feature and so part of identity, which made `random` two Lemmas: one
after *wie im Englischen* and one everywhere else. A loan (`versus`,
`circa`), a foreign name (`New York`, `Kyjiw`) and a glyph from another
script (`nº`, `※`, `٪`) keep their routes and lose the flag.

Amended on 2026-10-01: ADR 0045 first left the feature in place, undecided.
Decided on [#729](https://github.com/clockblocker/texteater/issues/729).

## Considered Options

- **Lexeme/X at click time as well, with intake's description.** Rejected: X
  lumps foreign words with gibberish, a Lexeme can't span `by the way`, and
  the learner still wouldn't know the word's language.
- **`Unresolved` for every foreign word.** Rejected: `whatever` is not
  unintelligible, and a learner reading German chat meets it often enough to
  want an entry.
- **`Lexeme/Foreign`.** Rejected: one Head per Lexeme rules out multiword
  chunks.
- **`sourceLang` from Dumling's Language enum.** Rejected: foreign material
  comes from any language, and Dumling supports three.
- **Emoji Descriptions on Foreign Readings.** Rejected: splitting senses of a
  word from another language asks for judgments the text cannot support, and
  the Translation already carries every sense.
- **Loans by grammar alone.** Chosen first, then rejected on 2026-09-29: a
  word that never inflects shows no grammar, so `lol` and `cringe` stayed
  Foreign although Duden lists them.
- **Loans by dictionary alone.** Rejected: dictionaries lag behind usage, and
  `geyeetet` already shows that `yeeten` is German before any dictionary lists
  it.
- **UD `foreign` on Lexeme routes, for a listed word the sentence frames as
  foreign** (`random, wie im Englischen`). Left open at first, rejected on
  2026-10-01: as a Core Feature it splits one dictionary word into two
  Lemmas, and the Foreign Family already says what is foreign.

## Consequences

- Amends [ADR 0002](./0002-lemma-is-grammatical-identity-and-reading-is-semantic-identity.md)
  and [ADR 0031](./0031-resolve-readings-through-the-emoji-description-alone.md):
  a Foreign Reading has no Emoji Description, and resolution has nothing to
  choose between.
- The UD `foreign` feature is retired from Dumling (amended 2026-10-01).
  Dumgen's grammar stage still asks it for DET and PRON
  ([#687](https://github.com/clockblocker/texteater/issues/687)) and stays
  red until that stage is rewritten.
- dumcorpus's X records are reshaped by these rules and stay Draft until
  reviewed.
- Dumgen's intake still offers `Lexeme/X` and has no Foreign route. The
  segmenter rewrite fixes that ([#730](https://github.com/clockblocker/texteater/issues/730)).
- Decided in [#622](https://github.com/clockblocker/texteater/issues/622) on
  [#595](https://github.com/clockblocker/texteater/issues/595); implemented in
  [#729](https://github.com/clockblocker/texteater/issues/729).
