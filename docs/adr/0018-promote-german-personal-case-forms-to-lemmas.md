---
status: accepted
---

# Give German pronoun coordinates grammatical identity

German PRON Case, Gender, possessor Gender and agreement Number belong in Core.
This preserves distinct reviewed Lemmas for same-spelling forms such as
uns/Acc and uns/Dat, and for possessives such as seiner/Masc and seines/Neut.
Reference Number remains separate: formal Sie may address one person while
requiring plural agreement. Reflexivity and historical status remain Surface
evidence. Other languages and the German DET feature split are unchanged.

Personal gender uses gender; possessive gender[psor] describes the possessor
independently of the possessed item's gender. Unmarked features are null,
compared literally, and never used as wildcards or guesses about a person's sex.
Plural agreement has no marked gender. A marked personal-pronoun gender requires
a third-person singular reference; a marked possessor gender additionally
requires a personal possessive. Inapplicable combinations are rejected.

Dumling validates linguistic values; Dumgen approves concrete members. Reviewed
case-bearing personal, formal-address, interrogative, demonstrative, relative,
indefinite and possessive members carry their attested coordinates. Invariant
members may leave Case unmarked; standalone einander keeps its existing single
identity. Alternate realizations such as accusative jemand belong to the
case-specific jemanden Lemma as Surfaces, rather than creating spelling-based
identities. An uncertain encounter does not authorize merging reviewed members.

This resolves #421 and #420's feature decisions. UD supplies feature meanings,
not this project's choice of Lemma granularity:
[German features](https://universaldependencies.org/de/index.html) and
[possessor gender](https://universaldependencies.org/u/feat/Gender-psor.html).

Amended by [ADR 0032](./0032-choose-core-features-per-route-for-the-learner.md)
on 2026-09-25: per-cell identity holds for pillars only, now including the
German articles and English PRON. Stem words such as `dieser`, `keiner` and the
possessives are one Lemma whose Surfaces carry case, number and gender.

Amended by ADR 0032 on 2026-09-25: Int and Rel `wer` and `was` mark gender,
Masc and Neut. This is the agreement each form takes, not a guess about a
person's sex, and it extends marked gender to these two paradigms only.
Dumling's gender check still binds only personal pronouns.

Amended on 2026-09-25 (#595): possessor gender and Reference Number leave
Core:

- Possessive `seiner`/`seinige` (his, its) and `ihrer`/`ihrige` (hers, theirs)
  are one Lemma each. Possessor gender and number describe the Surface, as on
  the possessive articles, and mark only what the form shows: `sein-` has
  gender[psor] Masc, Neut; `ihr-` marks neither. Formal `Ihrer` stays apart.
  This is the stem's own grammar, not a split by referent.
- `referenceNumber` is removed. It repeated `number` on personal pronouns, was
  null on formal `Sie`, and stood in for possessor number on possessives.

Amended on 2026-09-25 (#606): a pillar form can fit several cells that differ
only in what it refers to. Those cells stay separate Lemmas, and the referent
decides between them. This replaces an earlier rule of the same day that no
Lemma may depend on its referent.

- Accusative `sie` is 3sg Fem or 3pl, genitive `ihrer` 3sg Fem or 3pl,
  demonstrative `dem` and `dessen` Masc or Neut, and sentence-initial `Sie`
  formal or 3pl.
- Personal `ihm` and genitive `seiner` are two Lemmas each, the cells of `er`
  (Masc) and `es` (Neut). No Core gender is a value set.
- Dumgen reads the referent from the sentence. When the sentence cannot settle
  it, Dumgen reads the sentence before and the sentence after. If those don't
  settle it either, the most probable cell wins.
