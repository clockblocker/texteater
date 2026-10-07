---
status: accepted
---

# Close routes in Dumgen and author closed-class inventories in dumcorpus

Some closed-class units are authored instead of generated. A Note's drill-down
routes from a Lexeme to its article, auxiliary and reflexive in code, so those
units must exist without generation, stay readable from a package that is
green while Dumgen is rewritten, and be reviewed where the gold is. So
`dumcorpus` owns them as Authored Inventories, beside the gold (ADR 0037),
together with the facts and selectors over them. Dumgen enforces closure when
it resolves an encounter.

**Authored Inventories live in `dumcorpus`.** In German they are the AUX
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
adverbs `nie`, `niemals`, `nirgends`, `nirgendwo` and `keineswegs`, the
emphatic adverbs `selbst` and `selber`, the negation particle `nicht`,
infinitive `zu` and the modal particles (`aber`, `auch`, `bloß`, `denn`,
`doch`, `eben`, `eigentlich`, `einfach`, `einmal`, `etwa`, `halt`, `ja`,
`mal`, `nur`, `ruhig`, `schon`, `vielleicht`, `wohl`), which with `nicht`
make German PART fully authored. Each member comes with every spelling that
realizes it and each Reading's Knowledge and semantic relation claims.
`dumcorpus` checks them with Dumling and Dumrel. Dumling still owns
linguistic values and their validation, and Dumrel owns Knowledge types,
validation and relation algebra.

**The user's rulings fix what the German inventory holds**
([#595](https://github.com/clockblocker/texteater/issues/595)):

- `selbst` has the Readings 🫵 'oneself' and 😮 'even'; `selber` has 🫵.
- There is no DET `welch`, `mehr`, `manch`, `selber`, `wieviel` or
  `wievielte`. Each is a Reading or spelling of another Lemma, or another
  Kind ([ADR 0032](./0032-choose-core-features-per-route-for-the-learner.md)).
- `damals` 🕰 is a demonstrative adverb. `darum` and `daher` have a causal
  Reading 🤔 'that's why' beside 🔄 and 🛫. A da(r)- form's other senses are
  authored when gold attests them.
- The reciprocal pronominal adverbs (`miteinander`, `aufeinander`) have one
  Reading each
  ([ADR 0029](./0029-keep-preposition-government-out-of-lemma-identity.md)).
- PRON `ein wenig` has one Reading, 🤏, since an amount and a degree are
  shades of one meaning.
- PRON `beide` has no weak `beiden` cells: after an article, `beide` is ADJ.
  The PRON possessive has no weak forms either: after an article the weak
  possessive is ADJ, so `der meine` gives ADJ `meine`
  ([ADR 0040](./0040-make-the-article-a-satellite-of-its-phrase-head.md)).
  There are no PRON `-ig` possessives (`meinige`, `unsrige`, `Ihrige`):
  after an article they are ADJ (`de/possessive-after-article`).
- A cell's other accepted forms (`eins`, `keins`, `meins`, `dies`, `unsre`,
  genitive `jeden`, Acc and Dat `jemand`) are Licensed Variants beside its
  Canonical form.
- Bare PRON `viel` and `wenig` (*Er weiß viel*) are Canonical spellings with
  no cell, as DET `viel`'s uninflected spelling is. `vieles`, `vielem` and
  `weniges` stay Canonical in their cells.
- AUX `hab` is the Shorthand of `habe`. VERB `hab` is also the imperative,
  which is Canonical.
- `selben` in `am selben` is no spelling of `derselbe`. It is what remains of
  `demselben` after its Fused piece
  ([ADR 0035](./0035-attest-articles-and-fused-words-segment-by-segment.md)).

**The authored AUX members are drill-down pieces**
([#620](https://github.com/clockblocker/texteater/issues/620)). That includes
the periphrastic `würde`, `haben zu`, `sein zu` and `sein am`. An auxiliary
joins the verb it serves, so `segment.inUnits` never returns one as a target.
`segment.inLexemes` reaches them by drill-down, and it is deferred.

**Every authored member is complete.** It stores all Knowledge required or
advertised for its exact Reading under the applicable Knowledge policy, with
every supported aspect and translation language enabled, whatever a
Visitor's settings. Semantic relation coverage stores reviewed claims or an
explicit ReviewedEmpty decision for each applicable relation. `dumcorpus`'s
tests reject an incomplete member and a coverage claim that disagrees with
its content, so adding an advertised aspect or translation language means
completing the affected members before release. Resolving an exact authored
Reading publishes its stored Knowledge with no model call. This trades
catalog maintenance for deterministic content, and it removes encounter-time
generation as a way to hide an incomplete member.

**`dumcorpus` states Route Closure, and Dumgen enforces it.** A production
route starts Open and becomes Closed only once an operational implementation
and a reviewed Fixed Catalog exist. Closing a route is a production decision
based on reviewed content and available resolution behavior. It is route
policy, not a flag on linguistic values, and it changes neither the validity
nor the identity of a value. The closure facts are pure functions over the
inventories, in `dumcorpus/inventories`: `closedRoute` says whether a route is
Closed, and `authoredFor` returns the authored members of a Lemma. In German
the Closed Routes are Lexeme AUX, DET, PRON and PART. Every German PART is
authored, so a PART that no authored member spells is a Catalog Miss, not
Open production ([#876](https://github.com/clockblocker/texteater/issues/876)).
The selectors that find an authored member
(`authoredReading`, `selectAuthoredArticle`), grammatical navigation
(`selectGrammaticalAlternatives`,
[ADR 0019](./0019-select-grammatical-alternatives-from-reviewed-members.md))
and the model-free component derivation live there too, so tf-demo and
Dumgen share one copy
([ADR 0025](./0025-publish-transaction-side-entry-points-for-dum-packages.md)).
Dumgen owns the Catalog Miss: its click resolution returns `CatalogMiss`
from these facts when no authored member matches on a Closed Route. When
several members match (`es` has a referential and a nonreferential Reading),
Dumgen's judge picks one. Callers neither preload an inventory nor select a
catalog: applications start blank and request Units and Knowledge for
encounters. Dumdict applies dictionary changes and enforces dictionary
invariants; catalog-specific approval belongs to Dumgen.

**Closed Routes and Fixed Populations.** The Authored Inventory members that
bound a Closed Route are its Fixed Catalog; those on an Open Route are a
Fixed Population. A missing member on a Closed Route
returns an observable Catalog Miss. It never becomes `Unresolved` and never
falls back to Open production. A Closed Route also returns a Catalog Miss for
a Lemma it authors no Reading of. An Open Route may hold a Fixed Population of
ordinary Lemmas, Readings and Knowledge, selected deterministically, which
stabilizes reviewed identities without closing a productive route or adding a
special DTO class. The two kinds of miss differ:

- An occurrence that matches no member of a Fixed Population continues
  through Open production. It is not a Catalog Miss.
- A matched authored member whose required content is missing is a Catalog
  Miss on either kind of route.

An Open Route's authored Readings are not a closed set of senses
([#877](https://github.com/clockblocker/texteater/issues/877)). When a click's
Lemma there has authored Readings, the Reading judge offers them beside the
stored ones. If the clicked sense matches none of them, the Lemma gains a
New, generated Reading next to the authored ones, an ordinary Reading that is
not marked authored. In the user's words: "We accept that the authored sets
might not cover all possible things."

## Considered Options

- Inventories in Dumling with their Knowledge and relation claims in Dumrel.
  Rejected: every content change touched both foundational packages.
- Authored content in Dumgen. Rejected: drill-down needs the units while
  Dumgen is rewritten, and the gold they are reviewed against already lives
  in `dumcorpus`.
- The closure facts and selectors in Dumgen, over `dumcorpus`'s inventories.
  Rejected: they are pure functions over `dumcorpus`'s data
  ([ADR 0041](./0041-record-in-dumling-only-what-routing-and-drill-down-consume.md)),
  and tf-demo's dictionary transaction reads them in an isolate that must not
  load Dumgen.
