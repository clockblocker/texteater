---
status: accepted
---

# Assess Grundform with language-owned rules

Grundform means realization of the particular Lemma's canonical grammatical
form. Each language owns the accepted feature sets for its Family/Kind routes.
German infinitives and Hebrew past third-person masculine singular verbs use
different rules. Some conventions are Lemma lists: English `be`, `have` and
`do` cite their infinitive and the modals a finite form, and Hebrew cites
`היה` in past third-person masculine singular. The matcher is shared; the
linguistic conventions are not.

**The assessment lives in dumcorpus.** Citation conventions and Lemma lists
are facts about a language, not type shape, and Dumling holds only types and
schemas (system ADR 0041). The German article paradigm and the ADP Case Table
moved to dumcorpus for the same reason. `checkIfGrundform` is on the
`dumcorpus/inventories` entry, which a Convex transaction can import (system
ADR 0025). It reads Dumling's types and nothing else of Dumling but
`foldCase`. Every route with represented inflection must have a rule, and the
type check fails on one that has none.

Surface stores grammar and spelling evidence. Grundform is a synchronous
assessment of that evidence, with no stored discriminator or caller override.
Accepted Variant spelling remains eligible. The assessment trusts the
supplied spelling classification and does no spell checking.

A successful result contains a boolean. A known contradiction establishes
false even when another feature is unknown. Missing decisive features,
ambiguous analyses and unavailable Lemma conventions return a typed
`GrundformAssessmentError` with paths. A null feature bag is not proof of
Grundform; a present bag may have null coordinates that its route explicitly
allows as unmarked. Routes without represented inflection use form evidence.

Hebrew noun schemas admit explicit Sing and Ind evidence for singular absolute
forms, so the positive case can be stated. Null keeps its meaning as
unavailable evidence.

German and English ADV and ADJ depend on the Lemma's comparability
([system ADR 0042](../../../../docs/adr/0042-record-comparability-on-adv-and-adj-lemmas.md)).
A comparable Lemma needs Degree `Pos`. A non-comparable ADV or ADJ with no
inflection is Grundform by its spelling, as a closed-class word without
inflection already is.

Decided in [#792](https://github.com/clockblocker/texteater/issues/792). It
replaces Dumling's ADR 0002, which first placed the assessment in Dumling.

## Considered Options

- Keep the matcher in Dumling and pass the conventions in from dumcorpus.
  Rejected: a seam with one adapter that every caller has to feed.
- Keep Grundform in Dumling. Rejected: it keeps language data in the type
  package.
