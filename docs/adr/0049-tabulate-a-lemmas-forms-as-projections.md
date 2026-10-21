---
status: accepted
---

# Tabulate a Lemma's forms as projections

A learner sees a Lemma's inflection table: the forms its Paradigm gives and
the forms the learner has met. Tables must work for every language, Family
and Kind, and for every host. A table is therefore a pure projection over
what a dictionary stores: the Lemma Paradigm
([ADR 0048](./0048-keep-paradigm-variants-on-the-lemma-and-license-them-per-reading.md)),
the Lemma's Surface Entries and its Readings' Attestation Links.

**Projections only.** Tables, cells and placements are never stored. A view
is a function of those sets and of the Table Schema and pack versions, and
never of arrival order. A schema or derivation change needs no data
migration, and a host may cache a view keyed on those versions.

**Ownership.**

- **Dumling** holds label-free Table Schemas. A route's schema has panels,
  each a grid of rows and columns over Feature Pool bundles
  ([ADR 0032](./0032-choose-core-features-per-route-for-the-learner.md)). A
  cell's bundle is its panel's fixed bundle with its row and column, three
  disjoint parts drawn from the route's inflectional bag, and its Cell Key is
  that bundle reduced to the schema's key features. A Table Cell is never a
  Lemma, a Surface or a Paradigm Cell.
- **Dumcorpus** holds one Inflection Pack per language in
  `dumcorpus/inflection`: the schemas and which panels are core per Kind, the
  pack's form type and its display, derivation from a licensed selection of
  variants, the labels, and the authored closed-class paradigms. Tables that
  cover a whole language stay in dumcorpus
  ([ADR 0041](./0041-judge-dumling-fields-by-the-learner-and-by-classification.md)).
  The pack is the only language seam.
- **Dumdict** holds the table algebra in `dumdict/inflection`: placement,
  Surface Axes and the projection of a Lemma's tables. It is generic over the
  pack's form type, and it never branches on language, Family or Kind.
- **The host** draws the grids and the list and applies the pack's labels
  and display. It never names a case or a tense.

**One table per Licence Group, of core panels only.** Each Licence Group
(ADR 0048) gets one table, captioned with its Readings. A table draws only
the panels its pack declares core for the Kind. German: the NOUN declension;
the VERB Präsens, Präteritum, Konjunktiv II, Partizip II and Imperativ; ADJ
comparison. A cell holds the forms derived from the group's licensed
variants, several where a dimension is Free (`molk / melkte`), and the met
forms placed in it, merged by the pack's form key. A met form fills a cell
derivation leaves Unknown, as the weak noun `Menschen` does. A doubtful cell
stays Unknown and is never guessed. Derived forms are display-only: they
never become Surfaces, and grammatical navigation never reaches them
([ADR 0019](./0019-select-grammatical-alternatives-from-reviewed-members.md)).

**The list of met Surfaces outside the core panels.** Beside the tables, a
list holds every met Surface with no definite place in a core cell: one in a
non-core panel, one that fits no cell, and one whose cell is uncertain. It
also holds a form no stored variant derives, which its cell flags until a
variant is added for it (ADR 0048). The list never holds derived forms, so a
large paradigm stays small on the page: a Finnish or Turkish noun shows its
core panel and the forms the learner met.
Each line shows the form, a link to its Surface's entry and its Surface Axes,
every feature bundle it fills (`Fahrern`: Dat.Pl). The link targets the
Surface, not the Spelling Crossroad, which gathers every Lemma with the
spelling and can't point at this form of this Lemma.

**Placement.** A Surface Covers the cells it fills, is OneOf several
candidate cells, or is Unplaced. It fits a cell only when it matches on every
key feature, and a null is literal, never a wildcard
([ADR 0044](./0044-identify-german-pronouns-by-pillar-stem-and-referent.md)).

- A form that realizes several values, such as a Hebrew `number` of Sing and
  Dual, Covers each of their cells.
- A Surface Syncretism such as `jedem`
  ([ADR 0046](./0046-generate-a-syncretism-for-each-form-only-its-referent-resolves.md))
  is OneOf its candidate cells, uncertain in each, and no cell is guessed.
- A passive `wurde geschrieben` fits no active Präteritum cell, because
  `passive` is a key feature, and goes to the list.
- One spelling that derivation gives in several cells (`Mütter` in the
  Nom, Acc and Gen Plural) stays in each cell.

**Labels are the pack's.** Core DTOs carry no labels: schemas, bundles, Cell
Keys, the Paradigm and the views are pure Dumling and Dumrel data. Each pack
supplies its language's labels for panels, axes and bundles (German `N`,
`A`, `G`, `D`, `Präsens`, `Dat.Pl`), and the host applies them. There is no
locale parameter and no fallback chain.

**Attestation Links.** Dumdict records each occurrence as one Attestation
Link: the host's opaque ref, the Surface the occurrence realized, and the
Reading it was judged to be. It replaces a Reading Entry's plain attestation
strings, which lost which Surface an occurrence realized. Recording an
occurrence ensures its Surface and appends its link in one operation. The
same ref with the same Surface and Reading is a no-op; with anything else it
is rejected, since re-attribution is a move
([ADR 0043](./0043-correct-identity-by-moving-occurrences.md)). A ref
migrated from a plain string with no recorded form has no Surface. A link
gives a Reading its contexts, and it serves moves, Licence Conflicts, added
variants (ADR 0048) and forgetting. It never places a form: forms are the
Lemma's, so a met Surface shows in every table whose variants it fits.

**Forgetting.** When a move or removal leaves a Surface with no Attestation
Link, its Lemma forgets it, unless it holds user text: its notes, or
translations the learner wrote. User text is never dropped. A kept Surface
stays in the list, marked as having no attestations.

**Upstream of the tables.** A contraction never reaches a table. Dumgen's
Segment stage cuts fused words
([Dumgen ADR 0004](../../battery/dumgen/docs/adr/0004-make-segment-the-one-clickable-dto-produced-at-intake.md)),
and Grammatical Resolution records the pieces as Fused members
([ADR 0035](./0035-attest-articles-and-fused-words-segment-by-segment.md)),
so `im Wald` reaches Dumdict as ADP `in` and `Wald` Dat Sg. A periphrastic or
discontinuous form (`hat geschlossen`, `fährt ab`) is one Surface with a
whole-verbal bundle
([ADR 0022](./0022-describe-whole-verbal-surfaces-compositionally.md)). The
pack's form type carries its parts and its display joins them, so Dumdict
never models them.

## Considered Options

- Stored table records. Rejected: they duplicate the Paradigm and the
  Surfaces, and every rule change becomes a data migration.
- Generated full paradigms as stored data. Rejected: they store what code
  can rebuild and cost model tokens. They stay in reserve as a dimension type
  for a language whose forms rules can't derive.
- Every panel drawn. Rejected: a Finnish or Arabic paradigm would bury the
  few forms the learner met.
- Labels in the schemas, or a locale with a fallback chain. Rejected: the
  core types would stop being language-blind, and every language would carry
  every other's words.

## Consequences

- Hosts bundle pack code. The Obsidian plugin's German table rules move into
  the German pack
  ([#1229](https://github.com/clockblocker/texteater/issues/1229)).
- A Surface's id is its canonical JSON, so a Dumling Surface DTO change
  re-keys Surface Entries and their links. Dumdict rewrites both in one plan.
- The German attributive adjective's strong, weak and mixed declension is no
  Feature Pool feature yet, so no attributive-adjective panel can be keyed.
