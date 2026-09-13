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
