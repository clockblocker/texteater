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
reflexivity, the pronominal adverbs, and the interrogative and relative
w-adverbs (`wo`, `wohin`, `woher`, `wann`, `wie`, `warum`, `wieso`,
`weshalb`, `weswegen`), the directional `dahin`, `daher`, `hierhin` and `hierher`, the her- and hin-
adverbs (`heraus`, `hinaus`, `herein`, `hinein`, `herüber`, `hinüber`,
`herunter`, `hinunter`, `herauf`, `hinauf`, `heran`; colloquial `raus`,
`rein`, `rüber`, `runter`, `rauf` and `ran` are their Shorthands), the `irgend-`
adverbs (`irgendwo`, `irgendwann`, `irgendwie` and their kin), the Neg time
adverbs `nie` and `niemals` (ruled by the user on 2026-10-02), the negation
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
