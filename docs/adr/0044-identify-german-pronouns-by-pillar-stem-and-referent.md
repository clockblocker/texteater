---
status: accepted
---

# Identify German pronouns by pillar, stem and referent

German PRON follows the pillar test of
[ADR 0032](./0032-choose-core-features-per-route-for-the-learner.md): a closed
paradigm is a pillar only when its forms cannot be derived from another
paradigm.

**Pillars.** The personal pronouns, with the reflexive and formal `Sie`, are
suppletive (`ich`, `mir`, `mich`). The `der`-series demonstratives and
relatives, with `dessen`, `deren` and `denen`, are the table other words
borrow their endings from. Each cell of either is its own Lemma with case,
number and gender in Core, so same-spelling forms stay apart: `uns`/Acc and
`uns`/Dat are two Lemmas.

**Stems.** Every other German PRON puts another paradigm's endings on its own
stem and is one Lemma whose Surfaces mark case, number and gender: `dieser`,
`keiner`, the possessives, and `jemand`, `niemand` and `irgendjemand`, which
take article endings that are optional in use (*mit jemand*). An alternate
realization is a Surface, never a spelling-based identity: accusative
`jemanden` and `jemand` are Surfaces of `jemand`. Invariant words leave case
unmarked: `man` has one form (case unmarked, number Sing), and standalone
`einander` is one Lemma.

**`wer` and `was`.** They put the `der`-pronoun endings on `w-`, so their
case is on the Surface. Their gender is not agreement. `dieser`/`dieses`
copies its noun's gender, but nothing controls the gender of `wer` or `was`:
the speaker picks one by meaning, person or thing, and the word then controls
agreement (*Wer hat seinen Schirm vergessen?*). That is inherent gender, like
a noun's, so it is Core. `wer` (Masc) and `was` (Neut) are two stem Lemmas,
each for Int and for Rel, and their Surfaces mark case alone. `wen`, `wem`
and `wessen` are Surfaces of `wer`, and `was` and `wessen` are Surfaces of
`was`. Genitive `wessen` is a Surface of both, and the referent decides
which. Attributive `wessen` names a possessor person; it has one form and is
its own invariant Lemma with extPos DET.

**Gender and possessors.** Personal gender uses `gender`. Unmarked features
are null, compared literally, and never used as wildcards or as guesses about
a person's sex. Plural agreement has no marked gender, and a marked personal
gender needs a third-person singular. Possessor gender and number describe a
possessive's Surface, as they do on the possessive articles, and mark only
what the form shows: `sein-` (his, its) has gender[psor] Masc, Neut, and
`ihr-` (hers, theirs) marks neither. So `seiner`/`seinige` and
`ihrer`/`ihrige` are one Lemma each, and formal `Ihrer` stays apart. Only a
possessive marks possessor features. Reflexivity and historical status are
Surface evidence.

**The referent decides between pillar cells.** A pillar form can fit several
cells that differ only in what it refers to. Those cells stay separate
Lemmas, and no Core value is a set:

- Accusative `sie` is 3sg Fem or 3pl, genitive `ihrer` 3sg Fem or 3pl,
  demonstrative `dem` and `dessen` Masc or Neut, and sentence-initial `Sie`
  formal or 3pl.
- Personal `ihm` and genitive `seiner` are two Lemmas each, the cells of `er`
  (Masc) and `es` (Neut).

Dumgen reads the referent from the sentence. When the sentence cannot settle
it, Dumgen reads the sentence before and the sentence after. If those don't
settle it either, the most probable cell wins, and a wrong guess is corrected
by moving the occurrence (ADR 0043). An uncertain encounter never merges
reviewed members.

**One accepted collision.** Relative `derer` is nonstandard (Duden prescribes
`deren`) and is a Variant spelling of relative `deren`. Standalone
demonstrative `deren` and `derer` realize the same cells and differ in
direction: `derer` points ahead to a relative clause (*Wir gedenken derer, die
geholfen haben*), `deren` points back. No UD feature marks that direction, so
the two stay Lemmas of the same cells.

UD supplies feature meanings, not this project's Lemma granularity:
[German features](https://universaldependencies.org/de/index.html) and
[possessor gender](https://universaldependencies.org/u/feat/Gender-psor.html).

## Considered Options

- One Lemma per spelling. Rejected: `uns`/Acc and `uns`/Dat, and a learner's
  `mich` and `mir`, are separate words to learn.
- One Lemma per cell for every closed-class pronoun, the first version of
  ADR 0032. Rejected the same day: `dieser`, `keiner` and the possessives are
  learned once.
- Pillars for `wer`/`wen`/`wem`/`wessen` and `jemand`/`niemand`. Rejected by
  the pillar test on 2026-09-27: their forms are borrowed endings on a stem.
- `was` as the Neut Surface of one `wer` Lemma, and genitive `wessen` as one
  Lemma with its gender on the Surface. Rejected on 2026-09-28: it treated
  inherent gender as agreement, and it gave one Reading two meanings, *who*
  and *what*, which ADR 0002 forbids.
- Possessor gender in PRON Core, so that `seiner`/Masc and `seines`/Neut are
  two Lemmas. Rejected: it is the stem's own grammar, as on the possessive
  articles, not a split by referent.
- A `referenceNumber` feature. Rejected: it repeated `number` on personal
  pronouns, was null on formal `Sie`, and stood in for possessor number on
  possessives.
- No Lemma that depends on its referent, with a Core value set such as
  Masc|Neut for `ihm`. Rejected (#606): navigation compares Core values
  literally, and varying case from `er` must reach `ihn` and the masculine
  `ihm` and `seiner`, never a neuter cell.

## Consequences

- Supersedes [ADR 0018](./0018-promote-german-personal-case-forms-to-lemmas.md)
  and takes over the German pronoun parts of ADR 0032 and its amendments.
- Dumling's check binds gender to person and number only on personal
  pronouns, and rejects a cell coordinate marked both in Core and on the
  Surface.
- Decided on #420, #421, #606 and
  [#595](https://github.com/clockblocker/texteater/issues/595) between
  2026-09-25 and 2026-09-28.
