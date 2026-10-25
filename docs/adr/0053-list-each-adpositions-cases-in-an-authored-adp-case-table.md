---
status: accepted
---

# List each adposition's cases in an authored ADP Case Table

German ADP Core has no `governedCase`, since no two German ADPs differ by
case alone. An authored, closed table per language, the ADP Case Table, lists
each adposition with the positions it takes, before (Prep) or after (Post)
its complement. For each position it gives the allowed cases, a preferred
case where there is a norm, and whether it is two-way: `für` Prep {Acc},
`mit` Prep {Dat}, `auf` and `in` Prep {Acc, Dat} two-way, `trotz` Prep {Gen,
Dat} preferring Gen, `wegen` Prep {Gen, Dat} preferring Gen and Post {Gen},
`entlang` Post {Acc, Dat} preferring Acc and Prep {Gen, Dat}. A position it
doesn't list isn't allowed. A circumposition or other Locution ADP has one
case set and no position, since its words are its Canonical Form.

Neither the Lemma nor the Attestation records the position
([ADR 0032](./0032-choose-core-features-per-route-for-the-learner.md)): the
sentence shows it, and the table states what German allows and what a Note
can show. The table and its checks live in dumcorpus
([ADR 0041](./0041-judge-dumling-fields-by-the-learner-and-by-classification.md)),
since which cases a preposition takes is a fact about the language.

**Governors are checked against it.** Every Preposition complement of a
governor's Valency Frame
([ADR 0034](./0034-store-valency-as-e-valbu-frames-on-the-reading.md)),
alternatives included, is validated against the table: `warten` `auf` + Acc
and `bestehen` `auf` + Dat pass, `für` + Dat fails. A governed preposition
has no ADP Attestation; its case lives in the governor's frame.

**A free ADP occurrence records its case.** It records the case it took as
`realizedCase` in its `valencyEvidence`, from the judgement Grammatical
Resolution already makes for the case. `[Wegen] dem Regen` records Dat
against the preferred Gen. A Locution ADP records it the same way (`um des
Friedens willen` Gen). An occurrence whose complement shows no case records
none (`Köln versus Berlin`). dumcorpus accepts a realized case that one of
the adposition's positions allows. It fails an adposition the table doesn't
list, naming it; a case none of its positions allows, naming the word and the
case; and a governor's Preposition complement whose preposition the table
lacks.

**The Note renders from the table.** The ADP's Valency Block renders from it
(`` auf `etw` · Akk: wohin? · Dat: wo? ``), and each Source Context shows its
realized case and marks a colloquial one (`Dat · umgangssprachlich`).

## Considered Options

- A Core case set. Rejected: it holds the same facts inside identity, with no
  preferred case and no per-sentence case.
- A generated frame per ADP Reading. Rejected: two-way would depend on the
  emoji judge splitting location from direction, and a one-case slot cannot
  hold both cases when the judge merges them.
