---
status: accepted
---

# Record in Dumling only what routing and drill-down consume

Segmentation and resolution serve two tasks. A click or hover in a text routes
to the biggest semantic unit that contains the clicked piece. A resolved unit
made of smaller units lets the learner drill down to its parts from its Note.
Linguistic structure earns a place in the model only when one of these tasks
reads it. [ADR 0039](./0039-split-phrasemes-into-locutions-and-sayings.md) and
[ADR 0040](./0040-make-the-article-a-satellite-of-its-phrase-head.md) left open
what an Attestation records about its members; the answer follows from that
test.

**Dumling holds types and schemas.** It states what a unit is and which
feature values are well-formed. Facts about a language and the checks that
need them live in dumspec, next to the gold and the Rules: the authored
closed-class inventories ([ADR 0021](./0021-close-routes-in-dumgen-and-author-closed-class-inventories-in-dumspec.md)),
the ADP Case Table with its check of governors' frames, and the
`der`/`ein` paradigm with the article agreement check and the derivation of an
article's DET cell. A hand-built `ein Häuser` passes Dumling and fails
dumspec.

**Members carry no Member Role, and Dumling counts no Heads.** A Lexeme has
one Head and a Locution two or more, but that line is a classification Rule,
and Rules live in dumspec. The Attestation stores the Family as a result, as
it stores the Kind. Where something downstream reads a member, Dumling keeps a
targeted evidence field instead of a role: `articleEvidence` names the
article, `expletiveEvidence` the expletive, `valencyEvidence` the governed
prepositions. Which roles segmentation uses, if any, is decided with the
segmentation rewrite; dumspec then records them as annotation beside the
Attestation.

**A shared or elided fixed word leaves the other unit Partial, with no
evidence.** In `Sie traf die Entscheidung, er die Vorbereitungen`, `traf`
belongs to `eine Entscheidung treffen`, and `Vorbereitungen treffen` is
`[die, Vorbereitungen]`, Partial. Evidence pointing at `traf` would change
neither where a click routes nor what drill-down offers. `articleEvidence`
keeps its `Shared` variant.

**A Locution or Saying has a Breakdown.** Its parts are real Readings, reached
the way a Definition Text's words are: the Lemma's wording is segmented into
Lexemes and each piece resolves like any clicked piece. `den Faden verlieren`
breaks down into `[den, Faden]` NOUN and `[verlieren]` VERB. The Breakdown
belongs to the Lemma, so it is produced once per Lemma, and a component's Note
lists the multiword Lemmas it is part of. A morphemic breakdown of a Lexeme is
the same concept one level down and is out of scope. How the wording becomes
something clickable is an implementation choice.

**Drill-down from a Lexeme is read from model data.** No segmentation runs:

- a governed preposition from the Reading's Valency Frame (`warten` → ADP
  `auf`);
- an article from the Lemma's gender for the header and `articleEvidence` for
  an occurrence, its DET cell derived in dumspec;
- an auxiliary (`hat` in `hat gekocht` → AUX `haben` perfect) from the
  authored units in dumspec;
- a reflexive to the one authored unit per language that explains
  reflexivity, never to a case cell: `sich` alone cannot tell *er schämt
  sich* (Acc) from *er bildet sich etwas ein* (Dat).

A separable particle is a Morpheme and is not a drill-down target.

**Gold.** A dumspec sentence record lists only biggest units, one target per
Segment. A Breakdown Record holds one multiword Lemma's Breakdown: the Lemma's
wording as its sentence, its Lexeme targets as full Attestations, and a
pointer to the Lemma. Every target in every record, Breakdown Records
included, eventually names its Reading; a Reviewed target must (added
2026-09-27).

## Considered Options

- Member Roles on every member, with Dumling checking the Head count per
  Family. Rejected: it stores a classifier's rule in the model DTO.
- A role-neutral `sharedEvidence` field for shared articles and fixed words.
  Rejected: it serves neither task.
- Components as Unit Shadows in Reading Knowledge, modelled on Participle
  Source. Rejected: the parts are real Readings.
- Breakdowns stored per occurrence, as an inner layer of sentence records.
  Rejected: two sentences with one idiom would repeat it and could disagree.
- The ADP Case Table and the article paradigm stay in Dumling. Rejected: which
  cases `auf` takes is a fact about German, not about the model.

## Consequences

- Amends ADR 0039: Head and Member Role describe the Family Rule and are not
  recorded on the Attestation, and the shared-word evidence is dropped.
- Amends ADR 0040: the article is identified by `articleEvidence`, and the
  agreement check and DET-cell derivation move to dumspec.
- Moves the ADP Case Table decided in
  [#604](https://github.com/clockblocker/texteater/issues/604) from Dumling to
  dumspec.
- How segmentation produces units and Breakdowns is decided in Dumgen's
  segmentation ADRs.
- Decided in [#664](https://github.com/clockblocker/texteater/issues/664) on
  [#595](https://github.com/clockblocker/texteater/issues/595).

Amended by [ADR 0042](./0042-record-comparability-on-adv-and-adj-lemmas.md): a fact about one Lemma that decides which feature values its own Surfaces may carry belongs on the Lemma, even if no click or drill-down reads it. German and English ADV and ADJ record comparability in Core. Tables that cover a whole language stay in dumspec.

## Amendment (2026-09-29): judge a field by the learner and by classification

This replaces the scope test above. Where a click routes and what a Note
drills down to are presentation questions, and presentation does not decide
the model. A field in Dumling's DTOs is judged by two questions only:

- Could the information help the learner?
- Does the DTO shape help classification?

Either question is enough: a field that answers yes to one of them belongs in
the DTO, even if the other answer is no.

The other decisions stand: Dumling holds types and schemas, members carry no
Member Role, a shared or elided fixed word leaves the other unit Partial, and
a Locution or Saying has a Breakdown.

The first field admitted under this test is a Variant spelling's tags. A
Surface's `spelling` is `{ kind: "Canonical" }` or
`{ kind: "Variant", variantTags }`, a non-empty list in the order Licensed
(*zwo*, *auf Grund*), Historical (*daß*, *Photographie*), Regional (*nit*,
*nedd*) and Expressive (*ohhh*, *boahhh*), never Licensed with Historical.
The tags answer different questions, so they combine: Swiss *Strasse* is
Licensed and Regional, and a single type would need a priority rule that
drops what the learner could be told. No click or drill-down reads them.
A learner who meets *daß* is told it is the spelling before the 1996 reform,
and a classifier names why a spelling is not Canonical instead of stretching
"licensed" over dialect and drawn-out letters. Variant now covers every
non-canonical spelling of the Lemma that is not a mistake; a mistake stays a
Typo member. Decided on
[#595](https://github.com/clockblocker/texteater/issues/595).
