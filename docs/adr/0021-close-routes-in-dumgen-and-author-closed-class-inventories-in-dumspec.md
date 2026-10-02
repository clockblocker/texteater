---
status: accepted
---

# Close routes in Dumgen and author closed-class inventories in dumspec

Some closed-class units are authored instead of generated. A Note's drill-down
routes from a Lexeme to its article, auxiliary and reflexive in code, so those
units must exist without generation, stay readable from a package that is
green while Dumgen is rewritten, and be reviewed where the gold is. So
`dumspec` owns them as Authored Inventories, beside the gold (ADR 0037), and
Dumgen decides how production uses them.

**Authored Inventories live in `dumspec`.** In German they are the AUX
Readings, the PRON and DET pillar cells and stems, the unit that explains
reflexivity, the pronominal adverbs, reciprocal ones included, and the
interrogative and relative w-adverbs (`wo`, `wohin`, `woher`, `wann`, `wie`,
`warum`, `wieso`, `weshalb`, `weswegen`), the demonstrative `da`, `hier`,
`dort`, `dann`, `damals` and `so`, the directional `dahin`, `daher`,
`hierhin`, `hierher`, `dorthin` and `dorther`, the her- and hin- adverbs
(`heraus`, `hinaus`, `herein`, `hinein`, `herüber`, `hinüber`,
`herunter`, `hinunter`, `herauf`, `hinauf`, `heran`; colloquial `raus`,
`rein`, `rüber`, `runter`, `rauf` and `ran` are their Shorthands), the `irgend-`
adverbs (`irgendwo`, `irgendwann`, `irgendwie` and their kin), the negative
adverbs `nie`, `niemals`, `nirgends`, `nirgendwo` and `keineswegs` (ruled by
the user on 2026-10-02), the emphatic adverbs `selbst` and `selber`, the negation
particle `nicht`, infinitive `zu` and the modal particles (`aber`, `auch`,
`bloß`, `denn`, `doch`, `eben`, `eigentlich`, `einfach`, `einmal`, `etwa`,
`halt`, `ja`, `mal`, `nur`, `ruhig`, `schon`, `vielleicht`, `wohl`), which
with `nicht` make German PART fully authored
([#734](https://github.com/clockblocker/texteater/issues/734)), with every spelling that realizes them and each
Reading's Knowledge and semantic relation claims. `dumspec` checks them with
Dumling and Dumrel. Dumling still owns linguistic values and their
validation, and Dumrel owns Knowledge types, validation and relation algebra.

**Every authored member is complete.** It stores all Knowledge required or
advertised for its exact Reading under the applicable Knowledge policy, with
every supported aspect and translation language enabled, whatever a
Visitor's settings. Semantic relation coverage stores reviewed claims or an
explicit ReviewedEmpty decision for each applicable relation. `dumspec`'s
tests reject an incomplete member and a coverage claim that disagrees with
its content, so adding an advertised aspect or translation language means
completing the affected members before release. Resolving an exact authored
Reading publishes its stored Knowledge with no model call. This trades
catalog maintenance for deterministic content, and it removes encounter-time
generation as a way to hide an incomplete member.

**Dumgen owns Route Closure.** A production route starts Open and becomes
Closed only once an operational implementation and a reviewed Fixed Catalog
exist. Closing a route is a production decision based on reviewed content
and available resolution behavior. It is route policy, not a flag on
linguistic values, and it changes neither the validity nor the identity of a
value. Dumgen also owns the Catalog Miss, the selection of an authored member
for an encounter, and grammatical navigation (ADR 0019), and it reads the
inventories from `dumspec`. Callers neither preload an inventory nor select a
catalog: applications start blank and request Units and Knowledge for
encounters. Dumdict applies dictionary changes and enforces dictionary
invariants; catalog-specific approval belongs to Dumgen.

**Closed Routes and Fixed Populations.** A missing member on a Closed Route
returns an observable Catalog Miss. It never becomes `Unresolved` and never
falls back to Open production. An Open Route may hold a Fixed Population of
ordinary Lemmas, Readings and Knowledge, selected deterministically, which
stabilizes reviewed identities without closing a productive route or adding a
special DTO class. The two kinds of miss differ:

- An occurrence that matches no member of a Fixed Population continues
  through Open production. It is not a Catalog Miss.
- A matched authored member whose required content is missing is a Catalog
  Miss on either kind of route.

Amended on 2026-10-02: the emphatic adverbs `selbst`, with the Readings 🫵
'oneself' and 😮 'even', and `selber` 🫵 joined the inventory. DET `welch`,
`mehr`, `manch`, `selber`, `wieviel` and `wievielte` left it, as Readings or
spellings of other Lemmas or as other Kinds
([ADR 0032](./0032-choose-core-features-per-route-for-the-learner.md)).
Decided by the user on 2026-10-02
([#595](https://github.com/clockblocker/texteater/issues/595)).

Amended on 2026-10-02: `damals` 🕰 joined the demonstrative adverbs.
`darum` and `daher` gained a causal Reading 🤔 'that's why' beside 🔄 and
🛫; a da(r)- form's other senses are authored when gold attests them. The
reciprocal pronominal adverbs (`miteinander`, `aufeinander`) joined, one
Reading each ([ADR 0029](./0029-keep-preposition-government-out-of-lemma-identity.md)).
PRON `ein wenig` joined with one Reading, 🤏, since an amount and a degree
are shades of one meaning. Decided by the user on 2026-10-02
([#595](https://github.com/clockblocker/texteater/issues/595)).

Amended on 2026-10-02: PRON `beide` lost its weak `beiden` cells: after
an article, `beide` is ADJ. A cell's other accepted forms (`eins`, `keins`,
`meins`, `dies`, `unsre`, genitive `jeden`, Acc and Dat `jemand`) are
Licensed Variants beside its Canonical form. AUX `hab` is the Shorthand of
`habe`; VERB `hab` is also the imperative, which is Canonical. `selben` in
`am selben` is no spelling of `derselbe` but what remains of `demselben`
after its Fused piece
([ADR 0035](./0035-attest-articles-and-fused-words-segment-by-segment.md)).
A weak possessive after an article (`der meine`) and bare PRON `viel` and
`wenig` carry no spelling until a ruling. Decided by the user on 2026-10-02
([#595](https://github.com/clockblocker/texteater/issues/595)).

Amended on 2026-10-02: bare PRON `viel` and `wenig` (*Er weiß viel*) are
Canonical spellings with no cell, as DET `viel`'s uninflected spelling is.
`vieles`, `vielem` and `weniges` stay Canonical in their cells. The PRON
possessive lost its weak forms: after an article the weak possessive is ADJ,
so `der meine` gives ADJ `meine`
([ADR 0040](./0040-make-the-article-a-satellite-of-its-phrase-head.md)).
The PRON `-ig` possessives (`meinige`, `unsrige`, `Ihrige`) are retired:
after an article they are ADJ (`de/possessive-after-article`, 6ea8a981).
Decided by agents under the user's delegation (2026-10-02)
([#595](https://github.com/clockblocker/texteater/issues/595)).

Amended on 2026-10-02: the authored AUX members, including the periphrastic
`würde`, `haben zu`, `sein zu` and `sein am`, are drill-down pieces. An
auxiliary joins the verb it serves, so `segment.inUnits` never returns one
as a target; `segment.inLexemes` reaches them by drill-down and is out of
scope for now. Decided by the user on 2026-10-02
([#620](https://github.com/clockblocker/texteater/issues/620),
[#595](https://github.com/clockblocker/texteater/issues/595)).

## Considered Options

- Inventories in Dumling with their Knowledge and relation claims in Dumrel.
  Rejected: every content change touched both foundational packages.
- Authored content in Dumgen, the first version of this ADR. Rejected on
  2026-09-27: drill-down needs the units while Dumgen is rewritten, and the
  gold they are reviewed against already lives in `dumspec`.

## Consequences

- ADRs 0015 (Closed Routes and the Catalog Miss) and 0017 (Fixed Populations
  inside Open Routes) were merged into this ADR on 2026-09-28. Until then the
  two disagreed on a miss inside a Fixed Population; the split above
  reconciles them.
