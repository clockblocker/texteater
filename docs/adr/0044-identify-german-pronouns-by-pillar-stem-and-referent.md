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

**Free `sich`.** A reflexive the verb does not require is a unit of its own,
and a lexical reflexive is a member of its verb (`sich erinnern`,
[ADR 0003](./0003-attestation-supersedes-selection-and-owns-realization-coverage.md)).
Free `sich` is the reflexive's Acc or Dat cell, with person 3 in Core. Its
Surface marks the reflexive use (`reflex` Yes), as reflexive `mich`, `uns`
and `euch` mark theirs while staying their personal cells. A reciprocal use
(*Unsere Nachbarn grüßen sich*) keeps the same Lemma and Reading, since the
plural context makes the clause reciprocal, and no `sich` has `pronType` Rcp.
The `sich` with no case in Core is the reflexivity unit a lexical reflexive
drills down to
([ADR 0041](./0041-record-in-dumling-only-what-routing-and-drill-down-consume.md)),
and no spelling realizes it.

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

**`derer` is its own Lemma.** Standalone demonstrative `deren` points back
(*Ich habe deren viele*) and is the only Lemma of its Gen.Fem.Sg and Gen.Plur
cells. `derer` points ahead to a relative clause (*Wir gedenken derer, die
geholfen haben*). That is a different use of `der`, not a second spelling of
the cell: Duden marks *Wir gedenken deren, die …* wrong, and `derjenige` does
the same job with its own stem. A learner meets `derer` as a fixed pattern
before a relative clause and looks it up under that gloss. So `derer` is one
invariant Lemma beside `derjenige`, with `pronType` Dem in Core and one
uninflected form, as attributive `wessen` has. Duden gives it as a genitive
plural only.

**Elsewhere `derer` spells `deren`.** Wherever standalone `deren` could stand
instead, `derer` is a Licensed Variant of that `deren` cell. That covers the
relative (*die Opfer, derer wir gedenken*) and the demonstrative pointing back
(*Die Kartons stehen herum; wir wollen uns derer entledigen*). The test is a
swap. If `deren` fits, the learner who clicks `derer` sees `deren`, relative
or demonstrative, with `derer` marked as its accepted spelling. If only
`derer` fits, they see the `derer` Lemma, *of those (who …)*. `deren` stays
the Canonical Form, because it is the one form every pointing-back use
accepts: before a noun or a number only `deren` stands (*deren Freundin*,
*deren viele*). Attributive `deren` has no `derer` spelling.

Amended on 2026-10-01: standalone demonstrative `derer` was a second Lemma of
the `deren` cells, accepted as the one exception to ADR 0032's rule that no
two cell Lemmas of one Kind share all Core Features, because no UD feature
marks the direction. The exception let navigation such as "the plural of
`dessen`" land on two Lemmas. Decided on
[#595](https://github.com/clockblocker/texteater/issues/595).

Amended again on 2026-10-01: relative `derer` was called nonstandard and
carried no Variant tag, and pointing-back demonstrative `derer` would have
landed on the pointing-ahead Lemma. The "nonstandard" label rested on Duden's
*diese Frau, deren (nicht: derer) er sich annahm*. Duden contradicts that note
itself: its
[usage guide](https://www.duden.de/sprachwissen/sprachratgeber/Demonstrativpronomen-deren-derer)
says that "bei rückweisendem Anschluss (und allein stehend …) sind sowohl
deren als auch derer korrekt" (*die Opfer, deren oder derer wir heute
gedenken*), and its `deren` entries add *die Frist, innerhalb deren oder
derer*, a feminine singular like the rejected example.
[LEO](https://blog.leo.org/2018/08/24/zwei-woerter-aufgrund-derenderer-manche-ins-zweifeln-geraten/)
calls both forms correct outside the pointing-ahead use, *sich deren/derer
entledigen* included. It adds that the 19th-century rule reserving `derer`
for pointing ahead never took hold. [DWDS](https://www.dwds.de/wb/derer)
gives relative and demonstrative `derer` as synonyms of `deren` with no usage
label, and [grammis](https://grammis.ids-mannheim.de/kontrastive-grammatik/3673)
gives `derer` as the demonstrative's Gen.Fem.Sg and Gen.Plur form. A current
standard accepts the spelling, so it is Licensed. Neither STTS (PDS, PRELS)
nor UD marks the direction.

Amended on 2026-10-01: free `sich` and its reciprocal use are stated here.
ADR 0018 held them until a rewrite on 2026-08-30 cut them, and ADR 0044 did
not restate them. Decided on
[#237](https://github.com/clockblocker/texteater/issues/237) and
[#238](https://github.com/clockblocker/texteater/issues/238).

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
- A reciprocal `sich`, with `pronType` Rcp. Rejected (#237, #238): the
  plural context makes the clause reciprocal, not the word, and Rcp had no
  identity or selection job.
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
- Demonstrative `derer` as a second Lemma of the `deren` cells, kept apart by
  direction alone. Chosen first, rejected on 2026-10-01: the two shared every
  Core Feature, so navigation to either cell found two Lemmas.
- Relative `derer` as a nonstandard Variant with no tag, and pointing-back
  demonstrative `derer` as the pointing-ahead Lemma. Rejected on 2026-10-01:
  Duden's usage guide, LEO and DWDS accept `derer` wherever `deren` could
  stand. The pointing-ahead Lemma would have glossed *sich derer entledigen*
  as *of those who*, with no relative clause in sight.

## Consequences

- Supersedes [ADR 0018](./0018-promote-german-personal-case-forms-to-lemmas.md)
  and takes over the German pronoun parts of ADR 0032 and its amendments.
- Dumling's check binds gender to person and number only on personal
  pronouns, and rejects a cell coordinate marked both in Core and on the
  Surface.
- Decided on #420, #421, #606 and
  [#595](https://github.com/clockblocker/texteater/issues/595) between
  2026-09-25 and 2026-09-28; `derer` left the pillar on 2026-10-01, and no
  pillar collision is accepted since. The same day `derer` became a Licensed
  Variant of standalone relative and demonstrative `deren`.
