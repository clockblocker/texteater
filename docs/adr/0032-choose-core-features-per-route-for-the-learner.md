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

Closed, authored inventories are pillars of reading a language. A learner
meets `mich` and `mir`, `dem` and `den`, as separate words to learn, so every
Paradigm Cell of a pronoun or determiner is its own Lemma with one authored
Reading and its own Knowledge. Open classes keep paradigm-varying features
inflectional: a German NOUN's case and number stay on its Surface.

- German PRON keeps case, number and gender in Core
  ([ADR 0018](./0018-promote-german-personal-case-forms-to-lemmas.md)).
- German DET moves case, number and agreement gender into Core for its whole
  authored inventory: articles, demonstratives, possessives, `kein`,
  interrogatives and quantifiers. `der` Nom.Masc.Sg and `der` Dat.Fem.Sg are
  two Lemmas. A determiner without varying cells (`derlei`, `manch`) stays one
  Lemma with unmarked coordinates. Possessor gender stays on the Surface.
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
- A cell's Canonical Form is its own spelling. No value records that `diesem`
  belongs to `dieser`, so navigation that varies case also reaches cells of
  other paradigms with the same type and coordinates (`diesem` to `jenem`,
  `meinem` to `unserem`).
- A German determiner Surface in context has no inflectional bag unless it
  marks degree or possessor features. English PRON has no Surface inflection.
