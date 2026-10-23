---
status: accepted
---

# Count a Knowledge aspect left out of coverage as unreviewed

Beside its Reading Knowledge, a Spec Record's target records which aspects a
person has reviewed. `reading.coverage` holds one status per aspect, per
translation language and per semantic relation, as an Authored Inventory
does. An aspect left out is unreviewed, not empty. Without this, gold could
not tell "reviewed, none" from "never looked at". An aspect that a Knowledge
Policy adds later would also read as reviewed and empty on every old record.

`Authored` means the Knowledge holds the aspect, and a semantic relation
needs at least one claim. `ReviewedEmpty` means it holds none. Every stored
aspect is marked `Authored`. Coverage names only aspects that the route's
Knowledge Policy requests.

**The Lemma Paradigm is reviewed the same way.** A target also records
coverage of its Lemma's Paradigm ([ADR 0048]): one status per Variation
Dimension its route's Paradigm Policy names. A reviewed dimension covers its
variants and the target Reading's Licence, and a dimension left out is
unreviewed. `reading.paradigm` holds, per dimension, the forms or the
marker the target's Reading licenses, and `reading.coverage.paradigm` their
statuses.

**Knowledge depth counts the structural aspects.** A target's Knowledge layer
is complete when its coverage names every structural aspect its route
requests: valency, Source, Locution Type, Saying Type, Formula Role, each
requested semantic relation, and each Variation Dimension its Paradigm
Policy names. Those are a German noun's `plural` and a German verb's
`preterite`, from which code derives the Conjugation Class, `present1`,
`present2`, `present3`, `pastParticiple` and `subjunctivePast`.
`knowledge.produce` is scored against gold on these
([#883](https://github.com/clockblocker/texteater/issues/883)). Definition,
transcription and translations get a spot-check and do not hold depth back.
The Breakdown is no Knowledge depth aspect: `segment.inConstituents` and
`segment.inMorphemes` produce it, and they are scored as segmenters. A record
reviewed through Knowledge fails while a target leaves a structural aspect
uncovered. An Authored Inventory reviews its Readings' Knowledge and its
members' Paradigms ([ADR 0021]), so `{}` completes a target whose Reading it
holds.

**A Reading shared by several records carries one value.** Readings are
matched by Dumling's Reading identity. Every occurrence that holds Knowledge
carries the same Knowledge and coverage, so its gold is scored once. An
occurrence with no Knowledge yet is not compared, so one record can carry
the value before the others get theirs. A Lemma shared by several records
carries one Paradigm in the same way, and each record's target is scored on
its own Reading's Licences.

Decided on [#884](https://github.com/clockblocker/texteater/issues/884).

[ADR 0021]: ../../../../docs/adr/0021-close-routes-in-dumgen-and-author-closed-class-inventories-in-dumcorpus.md
[ADR 0048]: ../../../../docs/adr/0048-keep-paradigm-variants-on-the-lemma-and-license-them-per-reading.md
