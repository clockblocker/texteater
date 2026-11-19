---
status: accepted
---

# Name a valency complement by its case, never its referent

A valency complement records no referent. A German Case or Preposition
complement names its case, and a Hebrew or English Subject, DirectObject,
IndirectObject or Preposition names its function or its preposition. None of
them says whether a person, a thing or either fills it, in a Reading's
Valency Frame or in an Attestation's `valencyEvidence`.
[ADR 0034](./0034-store-valency-as-e-valbu-frames-on-the-reading.md) gave
them a `referent` of `Someone`, `Something` or `Either`; that field is gone,
in every language. Everything else ADR 0034 decides stands: the frame on the
Reading, its Slots and alternatives, each language's complement vocabulary,
where a frame comes from, the evidence and the rendering.

The referent had no consumer. The learner's valency line prints a slot by its
case alone (`jN` Acc, `jM` Dat, `jS` Gen), whoever fills it. Everything else
only stored the referent, validated it, or merged two of them in Contribute.
Producing it cost one jev question per governed preposition in Grammatical
Resolution ("does its complement here name a person or a thing?") and a
paragraph of Luna's valency prompt.

Luna writes the frame in case letters: `N`, `A`, `D` and `G` for a Case
complement, the preposition and a letter for a Preposition (`auf A`, `an D`),
`sich(A)` and `sich(D)` for a Reflexive (`außer sich(D)` in a fixed phrase).
On the valency bench, letters matched gold on 74.7% of 193 dev Readings over
8 repetitions, against 71.8% for the Duden-style notation with its referent
ignored, and on 63.6% of 54 held-out Readings against 64.2%, in 13 output
tokens instead of 16.

**A Case complement may fill two Slots.** Without a referent, a double
accusative needs the same complement twice: `fragen` 'ask' is a Required
Nom, an Optional Acc and an Optional Acc | Clause Ob | Clause W (`N (A)
(A|ob|w)`), and `lehren` and `kosten` are built the same way. E-VALBU writes
them as two `Kakk`, told apart by their place in the Satzbauplan, and so is a
frame: a German Case complement appears once per Slot but may recur in
another, as an Adverbial, Predicative or Clause may. Only the accusative
doubles in German, but the check does not single it out: a doubled dative is
a wrong frame like any other, fixed through Correct.

A Preposition complement still appears at most once per frame, and so does a
Hebrew or English Subject, DirectObject or IndirectObject. No frame governs
one preposition in one case twice, an attested governed preposition fills the
one Slot that holds it, and Contribute adds nothing that any stored Slot
covers. English tells its two objects apart by function already. A stored
complement covers a contributed one only when the two are equal.

## Considered Options

- Keep the referent for a learner line that might print `jemanden` and
  `etwas`. Rejected: the line prints the case, and a field waits for a
  consumer.
- Keep it only in Luna's notation (`jmd.`, `etw.`) and drop it when reading
  the answer. Rejected: letters scored higher on dev and tied on held-out, in
  fewer tokens.
