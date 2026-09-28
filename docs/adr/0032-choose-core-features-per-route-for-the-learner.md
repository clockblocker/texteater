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
  inflection. Reflexivity is Core because `myself` is its own spelled word;
  German free `sich` stays one form whose reflexive use is Surface evidence.
- German and English ADV and ADJ record comparability in Core, which decides
  whether their Surfaces mark Degree
  ([ADR 0042](./0042-record-comparability-on-adv-and-adj-lemmas.md)).
- A Locution route borrows the inflection features and Grundform rule of the
  Lexeme route with its Kind (ADR 0039). `discourseFormulaRole` is not Core;
  it is the Formula Role in Reading Knowledge.
- Hebrew is unchanged; its routes may choose differently.

**Articles are derived, not chosen.** An Article satellite's spelling, read
through its Fusion or Shorthand, and its Head's case, number and gender name
one DET cell ([ADR 0040](./0040-make-the-article-a-satellite-of-its-phrase-head.md)),
and dumspec performs the derivation (ADR 0041). `der` in `der Frau` is the
Lemma `der` Dat.Fem.Sg.

**Forms of one word are not synonyms.** Cells are reached through grammatical
navigation over Core Features
([ADR 0019](./0019-separate-grammatical-relations-from-semantic-relations.md)),
never through semantic relation claims. Navigation stays among pillars: a
stem's forms are its own Surfaces, so `diesem` never reaches `jenem`. A cell
is reached only when both ends mark every varied feature, and a plural cell's
unmarked gender counts as marked. Navigation compares Core values literally,
and no Core value is a set.

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
