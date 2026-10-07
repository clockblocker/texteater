---
status: accepted
---

# Choose Core Features per route for the learner

A Lemma's grammatical identity is its language, Canonical Form, Family, Kind
and Core Features ([ADR 0002](./0002-lemma-is-grammatical-identity-and-reading-is-semantic-identity.md)).
Being Core is not a property of a feature. Each route decides, and it decides
by what is best for the learner. A route is `language/Family/Kind`, unique as
a triple, and a Kind name may repeat across Families
([ADR 0039](./0039-split-phrasemes-into-locutions-and-sayings.md)). The
textbook test, constant across the paradigm means lexical, is one input to
the choice, not the rule.

**A language picks from the universal sets.** Dumling's universal sets stay
complete and language-neutral: the Kinds of each Family, Morpheme Kinds among
them, and the Feature Pool's features and values. A language picks from each
set only the members that apply to it and pulls in no set wholesale, so a
German-only feature such as `hasSepPrefix` reaches no English or Hebrew
route. No supported language is tonal, so none has a ToneMarking route.
Root-and-pattern morphology is Semitic, so only Hebrew has Transfix, and
English ablaut (`sing`, `sang`) is not one.

**The Feature Pool.** Lemma Core bags and Surface inflectional bags draw from
one catalog, the Feature Pool: Dumling's `UNIVERSAL_FEATURE_SCHEMA`, after
UD, narrowed per language (`DE_FEATURE_SCHEMA`). The language narrows every
feature its routes use to that language's values. A route narrows a feature
further only where its Kind uses fewer values: German PRON has no Art and
German DET no Rcp. Each route splits the features it uses into Core and
inflectional. Attestation, Reading and Knowledge have vocabularies of their
own and never carry a Feature Pool feature or its name. Their values may
coincide with the pool's: an Attestation's `realizedCase` has its own case
enum, and Dumrel has its own literals.

**The placement test.** Within the Feature Pool, the test chooses Core or
inflectional by what is best for the learner. Core tells apart the entity the
learner learns; an inflectional feature describes a reusable form of that
Lemma. A value that is neither leaves the pool and is restated in another
layer's own terms:

- Attestation evidence, if it describes this occurrence;
- Reading Knowledge, if it is a fact about a sense, a class or a type;
- a dumcorpus Rule or table, if it says which uses the language allows;
- or nothing, and it is dropped.

Each destination holds such values already. Inflection class
([ADR 0038](./0038-store-german-inflection-classes-as-reading-knowledge.md)),
valency ([ADR 0029](./0029-keep-preposition-government-out-of-lemma-identity.md),
[ADR 0034](./0034-store-valency-as-e-valbu-frames-on-the-reading.md)) and the
Locution and Saying Types ([ADR 0039](./0039-split-phrasemes-into-locutions-and-sayings.md))
are Reading Knowledge. Governed case is a dumcorpus table plus Attestation
evidence (ADR 0034), the article an Attestation member plus evidence
([ADR 0040](./0040-make-the-article-a-satellite-of-its-phrase-head.md)), and
`foreign` is dropped
([ADR 0045](./0045-give-foreign-material-a-foreign-family-and-retire-lexeme-x.md)).
An adposition's position is in the dumcorpus table alone (below).

One check helps: does a standard learner's dictionary of the language give the
value its own headword, or only a usage line under one headword? A usage line
means the value is not identity.

The check gives way for German reflexive verbs. Duden gives `sich lassen` only
a grammar line under `lassen`, yet each `sich X` is a VERB Lemma of its own,
and its `lexicallyReflexive` names the reflexive's case, Acc or Dat
([ADR 0029](./0029-keep-preposition-government-out-of-lemma-identity.md)).
E-VALBU gives `sich X` its own entry, learners learn `sich erinnern` as a
word, and the reflexive's case is fixed per such word.

The test reopens no split decided elsewhere: ADR 0044's pronoun cells, its
Dem/Rel split and the per-route choices below stand. Cells that only the
referent tells apart stay apart, and a generated Syncretism stands for them
when no text settles the referent
([ADR 0046](./0046-generate-a-syncretism-for-each-form-only-its-referent-resolves.md)).

**Pillars and stems.** A closed paradigm is a pillar only when its forms
cannot be derived from another paradigm: a suppletive paradigm (`ich`, `mir`,
`mich`) or a source table other words borrow their endings from (the `der`
and `ein` articles). A learner meets `mich` and `mir`, `dem` and `den`, as
separate words to learn, so every Paradigm Cell of a pillar is its own Lemma
with one authored Reading and its own Knowledge, and its Canonical Form is its
own spelling. A word whose forms are another paradigm's endings on its own
stem, or a pillar with a prefix, is a stem. It is learned once (`dieser`,
`mein`, `kein`): one Lemma whose forms are Surfaces. Open classes keep
paradigm-varying features inflectional: a German NOUN's case and number stay
on its Surface.

A pillar fixes its cell coordinates in Core. A stem leaves them null in Core
and marks them on each Surface, and Dumling rejects a coordinate marked in
both. Among Lemmas authored per cell, no two of one pillar share all Core
Features. A Syncretism is not a cell. Its list of open features keeps its
identity apart from every cell's, even where its Core equals one: `ihnen`
that is 3pl or formal is not the plain 3pl `ihnen` (ADR 0046). The `der` and
`ein` article tables are two pillars with the same cells, and their spellings
tell them apart.

**The routes decided so far:**

- German pure labels: no German route carries `abbr`, `numType` (DET, ADJ,
  ADV, NUM, SYM), `definite` on the article cells, `extPos` on DET, ADJ
  `variant`, NOUN `hyph` or PUNCT `punctType`. None
  splits a Lemma or tells a learner anything the spelling does not, and
  dumcorpus derives an article's cell from its spelling and its Head
  (ADR 0040). *BVG* and *K.* are Lemmas of their own because the text uses
  the letters as the name, and their Surfaces keep the letters. How an
  abbreviation expands is a relation
  ([#763](https://github.com/clockblocker/texteater/issues/763)), not
  identity.
- German DET: the `der` and `ein` article tables are pillars. `der`
  Nom.Masc.Sg and `der` Dat.Fem.Sg are two Lemmas, and `ein` stays per cell as
  the reference table for the `ein`-words. The two tables share their
  coordinates, so per-cell uniqueness and navigation hold inside one pillar.
  The other determiners are stems: the `der`-words (`dieser`, `jener`,
  `welcher`, `jeder`, `derselbe`), the `ein`-words (`kein`, the possessives,
  `irgendein`) and the quantifiers. Article Surfaces have no inflectional
  bag; a stem's Surface marks its cell. Interrogative and relative `welcher`
  are two Lemmas, because Duden gives them separate headwords; each w-adverb,
  one headword in Duden, is one Lemma
  ([ADR 0029](./0029-keep-preposition-government-out-of-lemma-identity.md)).
  Exclamative `welch` is a second Reading, ❗, of interrogative `welcher`,
  since Duden gives the exclamation under the one headword, so German DET has
  no Exc. `wie viel` is ADV `wie` and DET `viel`, word by word, and
  `wievielte` is an ADJ like the ordinals, so neither is a DET. Emphatic
  `selbst` and `selber` are ADVs, so German DET has no `selber` and no Emp.
- German DET and PRON stems: a stem's Canonical Form is its Nom.Masc.Sg cell,
  or its Nom.Plur cell when the word is plural-cited (`einige`, `beide`),
  even where Duden's headword is another form (`mancher`, `alle`). `viel` and
  `wenig` are usually bare, so DET and PRON alike take the bare form as
  Canonical Form. Uninflected `manch` and `welch` spell `mancher` and
  `welcher` without a cell, as uninflected `viel` and `all` do. DET `mehr`
  and `weniger` are Surfaces of `viel` and `wenig` that mark Cmp. PRON has no
  degree, so standalone `mehr` and `weniger` are PRON Lemmas. The dumcorpus
  Rule is `de/canonical-form-is-the-headword`, from the user's ruling on
  [#595](https://github.com/clockblocker/texteater/issues/595).
- German NOUN: gender sits in Core or on the Surface, never both on one
  Lemma. A noun with a gender of its own has it in Core. An adjectival noun
  for a person and a plural-only noun have Core gender null, and the first
  marks the gender its singular Surface shows
  ([ADR 0040](./0040-make-the-article-a-satellite-of-its-phrase-head.md)).
- German PRON: [ADR 0044](./0044-identify-german-pronouns-by-pillar-stem-and-referent.md).
- English PRON: case, number, gender and reflexivity are Core, so `I`, `me`,
  `my`, `mine` and `myself` are five Lemmas, and English PRON has no Surface
  inflection. Reflexivity is Core because `myself` is its own spelled word.
  German marks no reflexivity on a pronoun: reflexive `mich` is the Lemma
  `mich`, and free `sich` is the Acc or Dat cell of the reflexive (ADR 0044).
- German and English ADV and ADJ record comparability in Core, which decides
  whether their Surfaces mark Degree
  ([ADR 0042](./0042-record-comparability-on-adv-and-adj-lemmas.md)).
- A Locution route borrows the inflection features and Grundform rule of the
  Lexeme route with its Kind (ADR 0039). `discourseFormulaRole` is not Core;
  it is the Formula Role in Reading Knowledge.
- German ADP: Lexeme ADP has no Core Features. Where an adposition stands is
  not identity, so `wegen des Sturms` and `des Nebels wegen` attest one Lemma
  `wegen`; Duden, grammis and LEO each give the position as a usage line
  under one headword. No Lemma or Attestation records the position, since
  the sentence shows it. The ADP Case Table in dumcorpus lists the positions
  each adposition takes, with the cases for each (ADR 0034). German ADP has
  no `Circ`: a circumposition is a Locution ADP (ADR 0039), its bracket part
  of its Canonical Form. It has no `partType: Vbp`, since a separated verb
  particle is a member of its verb, and no `extPos: ADV`, which no Rule
  backs.
- German PART names its type in Core: `polarity: Neg` (*nicht*),
  `partType: Inf` (infinitive *zu*) or `partType: Mod` (a modal particle),
  exactly one ([#734](https://github.com/clockblocker/texteater/issues/734)).
- Hebrew routes make their own choices and may choose differently.

**Articles are derived, not chosen.** An Article satellite's spelling, read
through its Fusion or Shorthand, and its Head's case, number and gender name
one DET cell ([ADR 0040](./0040-make-the-article-a-satellite-of-its-phrase-head.md)),
and dumcorpus performs the derivation (ADR 0041). `der` in `der Frau` is the
Lemma `der` Dat.Fem.Sg.

**Forms of one word are not synonyms.** Cells are reached through grammatical
navigation over Core Features
([ADR 0019](./0019-select-grammatical-alternatives-from-reviewed-members.md)),
never through semantic relation claims. Navigation stays among pillars: a
stem's forms are its own Surfaces, so `diesem` never reaches `jenem`. It stays
inside the pillar it starts from, so `dem` never reaches `einem`. A cell
is reached only when both ends mark every varied feature, and a plural cell's
unmarked gender counts as marked. Navigation compares Core values literally,
and no Core value is a set. Navigation never reaches a Syncretism
(ADR 0046).

## Considered Options

- Choosing a determiner's headword by the noun's gender (masculine `der`,
  feminine `die`, neuter `das`, plural `die`, indefinite `ein`), so `der` in
  `der Frau` is a Surface of authored DET `die`. Rejected: the learner
  memorizes `der` and `dem` as words, and the headword choice hides the cell.
- One Lemma per cell for every closed-class word. Rejected: a stem word is
  learned once.
- The pillar test by memorization alone. Rejected: the derivation test above
  gives the same answer for the tables and also settles `jemand` and `wer`
  (ADR 0044).
- `adpType` in German ADP Core. Rejected: an adposition that stands on either
  side of its complement becomes two Lemmas with duplicated Readings, where
  every dictionary has one headword.
- Position on the ADP Attestation, beside its realized case. Rejected: the
  sentence always shows it, nothing reads it, and all it buys is a sharper
  case check for `entlang` and `zufolge`, which take different cases before
  and after their complement.
- Position on the Surface. Rejected: `wegen` is spelled the same in both
  positions, so it is no form of the word.
