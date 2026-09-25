---
status: accepted
---

# Choose Core Features per route for the learner

A Lemma's grammatical identity is its language, Canonical Form, Family, Kind
and Core Features ([ADR 0002](./0002-lemma-is-grammatical-identity-and-reading-is-semantic-identity.md)).
Being Core is not a property of a feature. Each language, Family and Kind
route decides, and it decides by what is best for the learner. The textbook
test, constant across the paradigm means lexical, is one input to that
choice, not the rule.

Some closed, authored inventories are pillars of reading a language: their
forms have to be memorized one by one, and the route's features name each cell
uniquely. A learner meets `mich` and `mir`, `dem` and `den`, as separate words
to learn, so every Paradigm Cell of a pillar is its own Lemma with one authored
Reading and its own Knowledge. A word made of a stem and borrowed article
endings (`dieser`, `mein`, `kein`) is learned once. It is one Lemma, and its
forms are Surfaces. Open classes keep paradigm-varying features inflectional:
a German NOUN's case and number stay on its Surface.

The route decides which features may be Core; a closed-class word fixes its
cell coordinates in Core only if it is a pillar. A stem Lemma leaves them null
in Core and marks them on each Surface, and Dumling rejects a coordinate marked
in both. Among Lemmas authored per cell, no two of one Kind share all Core
Features.

- German PRON pillars keep case, number and gender in Core
  ([ADR 0018](./0018-promote-german-personal-case-forms-to-lemmas.md)): the
  personal pronouns with reflexive and formal `Sie`, the `der`-series
  demonstratives and relatives, `wer`/`wen`/`wem`/`wessen`, and `jemand` and
  `niemand`.
- German DET pillars are the `der` and `ein` article tables. `der` Nom.Masc.Sg
  and `der` Dat.Fem.Sg are two Lemmas. `ein` stays per cell as the reference
  table for the `ein`-words.
- German stems are one Lemma in both DET and PRON: the `der`-words (`dieser`,
  `jener`, `welcher`, `jeder`, `derselbe`), the `ein`-words (`kein`, the
  possessives, `irgendein`) and the quantifiers. They cite their Nom.Masc.Sg
  form, or the plural when plural-cited (`einige`, `beide`). Possessor gender
  stays where it was: PRON Core, DET Surface.
- English PRON moves case, number, gender and reflexivity into Core: `I`,
  `me`, `my`, `mine` and `myself` are five Lemmas. Reflexivity is Core because
  `myself` is its own spelled word; German free `sich` stays one form whose
  reflexive use is Surface evidence.
- Hebrew is unchanged; its routes may choose differently.

Forms of one word are not synonyms. Cells are reached through grammatical
navigation over Core Features
([ADR 0019](./0019-separate-grammatical-relations-from-semantic-relations.md)),
never through semantic relation claims.

## Consequences

- Noun article composition derives the exact definite or indefinite DET cell
  from the noun's case, number, gender and article. `der` in `der Frau` is the
  Lemma `der` Dat.Fem.Sg. This supersedes the agreement-based headword choice
  of [ADR 0024](./0024-select-noun-article-identities-by-agreement.md).
- A pillar cell's Canonical Form is its own spelling. Navigation between
  cells stays among pillars; a stem's forms are its own Surfaces, so `diesem`
  never reaches `jenem`.
- German article Surfaces have no inflectional bag; a stem's Surface marks its
  cell. English PRON has no Surface inflection.

Amended on 2026-09-25 to confine per-cell identity to pillars.

Amended on 2026-09-25 to settle the pillar collisions (#595):

- `wer` takes masculine agreement and `was` neuter (*Wer hat seinen Schirm
  vergessen?*, *Was ist es?*), so their Int and Rel cells mark gender Masc and
  Neut. Genitive `wessen` is two Lemmas, Masc and Neut, like `uns`/Acc and
  `uns`/Dat. Attributive `wessen` names a possessor person and is Masc.
- `irgendjemand` is a stem. `man` has one form of its own and is an invariant
  Lemma: case unmarked, number Sing.
- Relative `derer` is nonstandard (Duden prescribes `deren`) and is a Variant
  spelling of relative `deren`.
- Standalone demonstrative `deren` and `derer` are the one accepted collision.
  They realize the same cells and differ in reference direction: `derer` points
  ahead to a relative clause (*Wir gedenken derer, die geholfen haben*),
  `deren` points back. No UD feature marks that direction.
- Grammatical navigation reaches a cell only when both ends mark every varied
  feature; a plural cell's unmarked gender counts as marked. Varying case from
  `jemand` never reaches `man`.
