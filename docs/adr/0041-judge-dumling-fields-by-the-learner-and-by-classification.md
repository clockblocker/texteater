---
status: accepted
---

# Judge Dumling's fields by the learner and by classification

Segmentation and resolution serve two tasks. A click or hover in a text routes
to the biggest semantic unit that contains the clicked piece. A resolved unit
made of smaller units lets the learner drill down to its parts from its Note.
Both are presentation questions, and presentation does not decide the model.
A field in Dumling's DTOs is judged by two questions only:

- Could the information help the learner?
- Does the DTO shape help classification?

Either question is enough: a field that answers yes to one of them belongs in
the DTO, even if the other answer is no.

**Dumling holds types and schemas.** It states what a unit is and which
feature values are well-formed. Facts about a language and the checks that
need them live in dumcorpus, next to the gold and the Rules: the authored
closed-class inventories ([ADR 0021](./0021-close-routes-in-dumgen-and-author-closed-class-inventories-in-dumcorpus.md)),
the ADP Case Table with its check of governors' frames, and the
`der`/`ein` paradigm with the article agreement check and the derivation of an
article's DET cell. A hand-built `ein Häuser` passes Dumling and fails
dumcorpus. A fact about one Lemma that decides which feature values its own
Surfaces may carry belongs on the Lemma, even if no click or drill-down reads
it: German and English ADV and ADJ record comparability in Core
([ADR 0042](./0042-record-comparability-on-adv-and-adj-lemmas.md)). Tables
that cover a whole language stay in dumcorpus.

**A Variant spelling names its tags.** A Surface's `spelling` is
`{ kind: "Canonical" }` or `{ kind: "Variant", variantTags }`, a non-empty
list in the order Licensed (*zwo*, *auf Grund*), Historical (*daß*,
*Photographie*), Regional (*nit*, *nedd*) and Expressive (*ohhh*, *boahhh*),
never Licensed with Historical. The tags answer different questions, so they
combine: Swiss *Strasse* is Licensed and Regional, and a single type would
need a priority rule that drops what the learner could be told. No click or
drill-down reads them. A learner who meets *daß* is told it is the spelling
before the 1996 reform, and a classifier names why a spelling is not
Canonical instead of stretching "licensed" over dialect and drawn-out
letters. Variant covers every non-canonical spelling of the Lemma that is not
a mistake; a mistake stays a Typo member.

**Members carry no Member Role, and Dumling counts no Heads.** A Lexeme has
one Head and a Locution two or more, but that line is a classification Rule,
and Rules live in dumcorpus. The Attestation stores the Family as a result, as
it stores the Kind. Where something downstream reads a member, Dumling keeps a
targeted evidence field instead of a role: `articleEvidence` names the
article, `expletiveEvidence` the expletive, `valencyEvidence` the governed
prepositions. Which roles segmentation uses, if any, is decided with the
segmentation rewrite; dumcorpus then records them as annotation beside the
Attestation.

**A shared or elided fixed word leaves the other unit Partial, with no
evidence.** In `Sie traf die Entscheidung, er die Vorbereitungen`, `traf`
belongs to `eine Entscheidung treffen`, and `Vorbereitungen treffen` is
`[die, Vorbereitungen]`, Partial. Evidence pointing at `traf` would change
neither where a click routes nor what drill-down offers. `articleEvidence`
keeps its `Shared` variant.

A shared auxiliary or a shared finite lexical verb is a shared word too, and
it belongs to the coordinated verb nearer to it:

- In *Sie hatte ihren Strohhut aufgesetzt und ihren Sonnenschirm
  aufgespannt*, `[hatte, aufgesetzt]` is VERB `aufsetzen`, and `aufspannen`
  is `[aufgespannt]`, Partial.
- In *Er stieg aus und gleich wieder ein*, `[stieg, aus]` is VERB
  `aussteigen` with Full coverage, and `einsteigen` is `[ein]`, Partial.

The shared word still counts toward the Partial unit's features, as a shared
article gives its noun a case. The Surface of `aufgespannt` describes the
whole pluperfect
([ADR 0022](./0022-describe-whole-verbal-surfaces-compositionally.md)), finite
Past, third person singular, `perfect: Yes`, while its members and
`normalizedSurface` hold only `aufgespannt`. The Surface of `ein` is finite
Past, third person singular. Which verb owns the shared word in other word
orders is settled by paired gold, not by a first-conjunct rule.

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
  an occurrence, its DET cell derived in dumcorpus;
- an auxiliary (`hat` in `hat gekocht` → AUX `haben` perfect) from the
  authored units in dumcorpus;
- a reflexive to the one authored unit per language that explains
  reflexivity, never to a case cell: `sich` alone cannot tell *er schämt
  sich* (Acc) from *er bildet sich etwas ein* (Dat).

A separable particle is a Morpheme and is not a drill-down target.

**Gold.** A dumcorpus sentence record lists only biggest units, one target per
Segment. A Breakdown Record holds one multiword Lemma's Breakdown: the Lemma's
wording as its sentence, its Lexeme targets as full Attestations, and a
pointer to the Lemma. Every target in every record, Breakdown Records
included, eventually names its Reading; a Reviewed target must.

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
  agreement check and DET-cell derivation move to dumcorpus.
- The ADP Case Table lives in dumcorpus, not Dumling.
- How segmentation produces units and Breakdowns is decided in Dumgen's
  segmentation ADRs.
