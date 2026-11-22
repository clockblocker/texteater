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
in every language. Everything else ADR 0034 decides stands: accumulated
concrete Valency Patterns on the Reading, each language's complement
vocabulary, click-by-click accumulation, the evidence and the Valency Block.

The referent had no consumer. The learner's valency line prints a complement by
its case alone (`jN` Acc, `jM` Dat, `jS` Gen), whoever fills it. Everything
else only stored the referent, validated it, or merged two of them in
Contribute. Producing it cost one jev question per governed preposition in
Grammatical Resolution ("does its complement here name a person or a thing?")
and a paragraph of Luna's valency prompt.

Luna writes each concrete pattern in case letters: `N`, `A`, `D` and `G` for a
Case complement, the preposition and a letter for a Preposition (`auf A`, `an
D`), `sich(A)` and `sich(D)` for a Reflexive (`außer sich(D)` in a fixed
phrase), and `<prep> dass|ob|w|zu+Inf|Inf` for a correlated Clause (`auf dass`).

**A Case complement may appear twice in one pattern.** Without a referent, a
double accusative needs the same complement twice: `jN jN fragen` is `N A A`,
and `lehren` and `kosten` are built the same way. A German `Case` complement
may recur in a pattern (`N A A`), while a `Preposition` complement and a
Hebrew or English `Subject`, `DirectObject` or `IndirectObject` appear at most
once per pattern. Duplicate patterns deduplicate by exact complement equality
on `Contribute`.

## Considered Options

- Keep the referent for a learner line that might print `jemanden` and
  `etwas`. Rejected: the line prints the case, and a field waits for a
  consumer.
- Keep it only in Luna's notation (`jmd.`, `etw.`) and drop it when reading
  the answer. Rejected: letters scored higher on dev and tied on held-out, in
  fewer tokens.
