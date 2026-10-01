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

**The Feature Pool.** Lemma Core bags and Surface inflectional bags draw from
one catalog, the Feature Pool: Dumling's `UNIVERSAL_FEATURE_SCHEMA`, after
UD, narrowed per language (`DE_FEATURE_SCHEMA`). Each route splits the
features it uses into Core and inflectional. Attestation, Reading and
Knowledge have vocabularies of their own and never carry a Feature Pool
feature or its name. Their values may coincide with the pool's: an
Attestation's `realizedCase` has its own case enum, and Dumrel has its own
literals.

**The placement test.** Within the Feature Pool, the test chooses Core or
inflectional by what is best for the learner. Core tells apart the entity the
learner learns; an inflectional feature describes a reusable form of that
Lemma. A value that is neither leaves the pool and is restated in another
layer's own terms:

- Attestation evidence, if it describes this occurrence;
- Reading Knowledge, if it is a fact about a sense, a class or a type;
- a dumspec Rule or table, if it says which uses the language allows;
- or nothing, and it is dropped.

Each has been done before. Inflection class
([ADR 0038](./0038-store-german-inflection-classes-as-reading-knowledge.md)),
valency ([ADR 0029](./0029-keep-preposition-government-out-of-lemma-identity.md),
[ADR 0034](./0034-store-valency-as-e-valbu-frames-on-the-reading.md)) and the
Locution and Saying Types ([ADR 0039](./0039-split-phrasemes-into-locutions-and-sayings.md))
went to Reading Knowledge. Governed case went to a dumspec table plus
Attestation evidence (ADR 0034), the article to an Attestation member plus
evidence ([ADR 0040](./0040-make-the-article-a-satellite-of-its-phrase-head.md)),
and `foreign` was dropped
([ADR 0045](./0045-give-foreign-material-a-foreign-family-and-retire-lexeme-x.md)).
An adposition's position went to the dumspec table alone (below).

One check helps: does a standard learner's dictionary of the language give the
value its own headword, or only a usage line under one headword? A usage line
means the value is not identity.

The test reopens no split already decided: ADR 0044's pronoun cells and its
Dem/Rel split, and the per-route choices below, stand. ADR 0044 itself
reopened its cells on 2026-10-01: a pronoun form whose cells differ in gender
alone is now one cell, because the referent may choose only between cells
that differ in who is meant.

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
both. Among Lemmas authored per cell, no two of one Kind share all Core
Features.

**The routes decided so far:**

- German DET: the `der` and `ein` article tables are pillars. `der`
  Nom.Masc.Sg and `der` Dat.Fem.Sg are two Lemmas, and `ein` stays per cell as
  the reference table for the `ein`-words. The other determiners are stems:
  the `der`-words (`dieser`, `jener`, `welcher`, `jeder`, `derselbe`), the
  `ein`-words (`kein`, the possessives, `irgendein`) and the quantifiers. A
  stem cites its Nom.Masc.Sg form, or the plural when plural-cited (`einige`,
  `beide`). Article Surfaces have no inflectional bag; a stem's Surface marks
  its cell.
- German PRON: [ADR 0044](./0044-identify-german-pronouns-by-pillar-stem-and-referent.md).
- English PRON: case, number, gender and reflexivity are Core, so `I`, `me`,
  `my`, `mine` and `myself` are five Lemmas, and English PRON has no Surface
  inflection. Reflexivity is Core because `myself` is its own spelled word.
  German keeps reflexivity on the Surface: reflexive `mich` is the Lemma
  `mich`, and free `sich` is the Acc or Dat cell of the reflexive (ADR 0044).
- German and English ADV and ADJ record comparability in Core, which decides
  whether their Surfaces mark Degree
  ([ADR 0042](./0042-record-comparability-on-adv-and-adj-lemmas.md)).
- A Locution route borrows the inflection features and Grundform rule of the
  Lexeme route with its Kind (ADR 0039). `discourseFormulaRole` is not Core;
  it is the Formula Role in Reading Knowledge.
- German ADP: Lexeme ADP Core is `abbr` only. Where an adposition stands is
  not identity, so `wegen des Sturms` and `des Nebels wegen` attest one Lemma
  `wegen`; Duden, grammis and LEO each give the position as a usage line
  under one headword. No Lemma or Attestation records the position, since
  the sentence shows it. The ADP Case Table in dumspec lists the positions
  each adposition takes, with the cases for each (ADR 0034). `Circ` left
  German ADP: a circumposition is a Locution ADP (ADR 0039), its bracket part
  of its Canonical Form. `partType: Vbp` left too, since a separated verb
  particle is a member of its verb, and `extPos: ADV`, which no Rule backed.
- German PART names its type in Core: `polarity: Neg` (*nicht*),
  `partType: Inf` (infinitive *zu*) or `partType: Mod` (a modal particle),
  exactly one ([#734](https://github.com/clockblocker/texteater/issues/734)).
- Hebrew is unchanged; its routes may choose differently.

**Articles are derived, not chosen.** An Article satellite's spelling, read
through its Fusion or Shorthand, and its Head's case, number and gender name
one DET cell ([ADR 0040](./0040-make-the-article-a-satellite-of-its-phrase-head.md)),
and dumspec performs the derivation (ADR 0041). `der` in `der Frau` is the
Lemma `der` Dat.Fem.Sg.

**Forms of one word are not synonyms.** Cells are reached through grammatical
navigation over Core Features
([ADR 0019](./0019-select-grammatical-alternatives-from-reviewed-members.md)),
never through semantic relation claims. Navigation stays among pillars: a
stem's forms are its own Surfaces, so `diesem` never reaches `jenem`. A cell
is reached only when both ends mark every varied feature, and a plural cell's
unmarked gender counts as marked. Navigation compares Core values literally,
and no Core value is a set. ADR 0044 makes one exception on that precedent: a
pronoun cell whose gender is null because its form serves two genders alike
(`ihm`) is reached from each of them (`er`, `es`).

Amended on 2026-10-01: the Feature Pool and the placement test are stated for
the first time, and German ADP Core keeps only `abbr`. `adpType` was Core, so
preposed and postposed `wegen`, `entlang` and `gegenüber` were two Lemmas
each. Decided on [#733](https://github.com/clockblocker/texteater/issues/733)
with [#652](https://github.com/clockblocker/texteater/issues/652).

Amended on 2026-10-01: the English PRON line said German free `sich` "stays
one form", which read as one Lemma. `sich` has been authored as two pillar
cells, Acc and Dat, since 2026-09-13, and ADR 0044 states it; only the
wording changed.

Amended on 2026-10-01: ADR 0044 merged the pronoun cells that differ in
gender alone (`ihm`, `seiner`, `dem`, `dessen`) and lets navigation reach
each from both genders it serves
([#743](https://github.com/clockblocker/texteater/issues/743)). The sentence
on decided splits and the navigation paragraph point to it.

## Considered Options

- Choosing a determiner's headword by the noun's gender (masculine `der`,
  feminine `die`, neuter `das`, plural `die`, indefinite `ein`), so `der` in
  `der Frau` was a Surface of authored DET `die`. Rejected on 2026-09-25: the
  learner memorizes `der` and `dem` as words, and the headword choice hid the
  cell. This was ADR 0024.
- One Lemma per cell for every closed-class word. Rejected the same day:
  a stem word is learned once.
- The pillar test by memorization alone. Replaced on 2026-09-27 by the
  derivation test above, which gives the same answer for the tables and
  settles `jemand` and `wer` (ADR 0044).
- `adpType` in German ADP Core. Rejected on 2026-10-01: an adposition that
  stands on either side of its complement became two Lemmas with duplicated
  Readings, where every dictionary has one headword.
- Position on the ADP Attestation, beside its realized case. Rejected the
  same day: the sentence always shows it, nothing reads it, and all it bought
  was a sharper case check for `entlang` and `zufolge`, which take different
  cases before and after their complement.
- Position on the Surface. Rejected: `wegen` is spelled the same in both
  positions, so it is no form of the word.
