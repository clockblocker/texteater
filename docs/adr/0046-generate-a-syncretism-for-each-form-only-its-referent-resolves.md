---
status: accepted
---

# Generate a Syncretism for each form only its referent resolves

Some German pronoun forms spell several Paradigm Cells that only the referent
tells apart: `ihm` is the dative of `er` and of `es`, and accusative `sie` is
3sg feminine, 3pl or, at a sentence's start, formal `Sie`.
[ADR 0044](./0044-identify-german-pronouns-by-pillar-stem-and-referent.md)
let the referent pick a cell, from the sentence or the sentences around it,
and when they did not settle it the most probable cell won. Its #743
amendment then merged the cells that differ in gender alone into one cell
with gender null. A sentence that names the referent (*Ihr Bruder zieht um;
Anna hilft ihm*) could no longer record it, and `sie` still needed a guess.

**A Syncretism is one spelling of units only the referent tells apart.** It
is that unit with two more fields:

```ts
type Syncretism<U extends "Lemma" | "Surface", L, F, K> = Unit<U, L, F, K> & {
	syncretic: [FeatureName, ...FeatureName[]];
	syncretized: [Unit<U, L, F, K>, Unit<U, L, F, K>, ...Unit<U, L, F, K>[]];
};
```

- `syncretized` holds its units by value. They share the route and the
  Canonical Form, compared without letter case: `ihnen` and formal `Ihnen`
  share one. They are distinct, listed in identity order, and none is a
  Syncretism. The Syncretism is spelled as one of them.
- Its features keep the values its units agree on and are null where they
  disagree, and `syncretic` names those features in alphabetical order.
  Dumling checks both against the units. No other unit has `syncretic`.
- Without `syncretized` it is still a valid unit, and that view is what a
  classifier answers and a checker reads. `ihm` with `syncretic: ["gender"]`
  says "the dative of `er` or `es`; the text does not say which". The list
  keeps the view exact where a null cannot: `polite` is Form or null, so
  only the list tells `ihnen` with `syncretic: ["polite"]`, *them* or formal
  *you*, from plain `ihnen`, *them*.
- Its identity is a Lemma's identity plus its `syncretic` list, and its units
  are not part of it. The view and the whole Syncretism are one identity, so
  an answer finds its Syncretism without a lookup table, and no Syncretism
  shares an identity with a unit, which has no list.
- A Lemma Syncretism has Readings like any Lemma, and a Surface, Reading or
  Attestation may name it wherever it names a Lemma. Reading and Attestation
  have no Syncretism of their own: Emoji Descriptions tell a Lemma's Readings
  apart ([ADR 0031](./0031-resolve-readings-through-the-emoji-description-alone.md)),
  and an occurrence attests one unit.
- A Surface Syncretism stands for Surfaces of one Lemma that only the
  referent tells apart: `jedem`, the dative of the stem `jeder` in the
  masculine or the neuter. Its units share the Lemma, the form compared
  without letter case, the spelling and the Surface features, and are listed
  in key order: Lemma identity, form, then the inflectional features they
  mark. Its inflectional features keep the values its units agree on, and
  `syncretic` names the inflectional features they disagree on. It names one
  Lemma, so it adds no Reading and no Knowledge.

A route accepts Syncretisms only where its schema allows them. German PRON
allows Lemma Syncretisms and Surface Syncretisms.

**Dumcorpus generates every Syncretism, and nobody authors one.** Its source is
the German Authored Inventory
([ADR 0021](./0021-close-routes-in-dumgen-and-author-closed-class-inventories-in-dumcorpus.md)).
A group is the PRON pillar cells that share a spelling, compared without
letter case, and every Core Feature but gender, number and politeness. Each
closed part of a group, two or more of its cells, gets a Syncretism; a part
is closed when every cell of the group that has the part's shared values
belongs to it. Accusative `sie` gets three: 3sg Fem or 3pl, 3pl or formal,
and all three. No two closed parts share their features and list, so a
Syncretism's units follow from its identity. The sentence's grammar settles
every other shared spelling, and those get none: case (`uns`),
demonstrative or relative (`dem`), PRON or DET, and an article, whose cell
its Head decides
([ADR 0040](./0040-make-the-article-a-satellite-of-its-phrase-head.md)). A
Syncretism's Reading has the Emoji Description its units share, and
generation fails if they differ. Its Knowledge joins theirs, and an authored
definition replaces the joined one.

A stem PRON Lemma marks its cell on its Surfaces
([ADR 0032](./0032-choose-core-features-per-route-for-the-learner.md)), so its
Syncretisms are Surface Syncretisms. Its Surfaces that share a spelling, a
case and a number and differ in gender alone get one: `jedem`, `keinem`,
`manchem`, `diesem` and genitive `keines`, each Masc or Neut. A stem's
Syncretism leaves gender alone open. Dumcorpus generates them from the stem
spellings of the Authored Inventory.

**A referent no text settles attests the Syncretism.** A pronoun attests the
cell its referent settles, a pillar's Lemma or a stem's Surface. When
neither its sentence nor its Referent Context settles the referent, it
attests the Syncretism of the cells still possible, and no cell is guessed:
*Von den Kindern helfe ich jedem* attests neuter `jedem`, and `jedem` with
no referent in sight attests its Surface Syncretism. A Spec Record judges by
its own sentence and stores the whole Syncretism.

**Navigation reaches only cells.** Varying case from `er` reaches `ihm`
Masc. No null is a wildcard, and a Syncretism is reached from its units'
Notes.

## Considered Options

- The referent always picks a cell, the most probable one when no text
  settles it: ADR 0044 until 2026-10-01. Rejected: the learner sees a gloss
  the text does not support, and a classifier is scored on a guess.
- One cell with gender null for forms that differ in gender alone (#743).
  Rejected: it erased a referent the sentence names, and it could not cover
  number or politeness, which mean different people.
- A Core value set such as `Masc|Neut` (#606). Rejected again: navigation
  compares Core values literally.
- The candidate cells listed on the Attestation. Rejected: the open case gets
  no Reading or Knowledge, and every occurrence repeats the list.
- Nulls alone as the view, with no list. Rejected: `polite` is Form or null,
  so 3pl-or-formal `sie` would read as plain 3pl `sie`, and the three-way
  `sie` as the two-way one.
- An identity made of the units' identities. Rejected: the view has no
  units, so an answer would need a lookup table to find its Syncretism.
- One Syncretism per group, for all its cells. Rejected on 2026-10-02:
  lowercase `sie` with an open referent would offer formal *you*, which its
  spelling rules out, and *Sie gingen* would offer *she*, which its verb
  rules out.
- A stem's gender-only Surfaces with no Syncretism, so an open referent
  gets a guessed cell or Unresolved. Rejected: `jedem` with an open referent
  is the case of `ihm`, and either answer misleads the learner or loses the
  click.
- Authored Syncretisms. Rejected: the cells hold every fact a Syncretism
  needs, and generation keeps the two in step.

## Consequences

- Amends [ADR 0002](./0002-lemma-is-grammatical-identity-and-reading-is-semantic-identity.md):
  a Syncretism's identity includes its `syncretic` list.
- Amends ADR 0044: `ihm`, `seiner`, `dem`, `dessen`, `einem` and `eines` are
  a Masc and a Neut cell each again, its navigation exception is retired, and
  a referent no text settles attests a Syncretism.
  [ADR 0032](./0032-choose-core-features-per-route-for-the-learner.md)
  follows.
- Gold: 24 targets move. 11 leave a gender-null cell for a Masc cell, 7 for
  a Neut cell and 4 for the `ihm` Syncretism. Sentence-initial *Sie gingen*
  and *Ihnen kann es keiner recht machen* attest the 3pl-or-formal
  Syncretisms of `sie` and `ihnen`.
- Amends ADR 0032: a stem's gender-only Surfaces have a Surface
  Syncretism.
- Decided by the user on 2026-10-02 on
  [#829](https://github.com/clockblocker/texteater/issues/829); stem
  Surface Syncretisms on 2026-10-03 on
  [#876](https://github.com/clockblocker/texteater/issues/876).
