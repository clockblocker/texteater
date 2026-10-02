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
its own invariant Lemma, cited apart from `wer`.

**Gender and possessors.** Personal gender uses `gender`. Unmarked features
are null, compared literally, and never used as wildcards or as guesses about
a person's sex. Plural agreement
has no marked gender, and a marked personal gender needs a third-person
singular. Possessor gender and number describe a possessive's Surface, as
they do on the possessive articles, and mark only what the form shows: `sein-` (his, its) has gender[psor] Masc, Neut, and
`ihr-` (hers, theirs) marks neither. So `seiner`/`seinige` and
`ihrer`/`ihrige` are one Lemma each, and formal `Ihrer` stays apart. Only a
possessive marks possessor features, and historical status is Surface
evidence. No pronoun marks reflexivity.

**Formal address.** Formal `Sie`, `Ihnen` and `Ihrer`, and the possessive
`Ihr`, are the third person plural with `polite` Form. Person 2 only restated
what `polite` Form says, as `referenceNumber` once restated `number`. Duden,
LEO, grammis and TIGER treat the polite form as the 3rd person plural, used
for one person or several, and the verb (*Sie sind*), free `sich` (*setzen
Sie sich*) and `Ihr` agree with it without an exception. The pronoun cells
keep number Plur, because that is their agreement, not their meaning. So
formal `Sie` and 3pl `sie` differ in politeness alone. `polite` is Form or
null: informal `du`, `ihr`, `dein` and `euer` leave it null, since person 2
already says who is meant.

**Free `sich`.** A reflexive the verb does not require is a unit of its own,
and a lexical reflexive is a member of its verb (`sich erinnern`,
[ADR 0003](./0003-attestation-supersedes-selection-and-owns-realization-coverage.md)).
Free `sich` is the reflexive's Acc or Dat cell, with person 3 in Core.
Reflexive `mich`, `uns` and `euch` stay their personal cells, and no Surface
marks the reflexive use, which the sentence shows. A reciprocal use
(*Unsere Nachbarn grüßen sich*) keeps the same Lemma and Reading, since the
plural context makes the clause reciprocal, and no `sich` has `pronType` Rcp.
The `sich` with no case in Core is the reflexivity unit a lexical reflexive
drills down to
([ADR 0041](./0041-record-in-dumling-only-what-routing-and-drill-down-consume.md)),
and no spelling realizes it.

**The referent chooses between cells, and a Syncretism stands in when it
cannot.** A pillar form can fit several cells. No Core value is a set, and
each cell is a Lemma of its own:

- The sentence's grammar tells apart cells that differ in case, and a
  demonstrative from a relative.
- The referent tells apart cells that differ only in gender, number or
  politeness. Personal `ihm` and `seiner` are the dative and genitive of
  `er` (Masc) and of `es` (Neut). Der-series `dem` and `dessen`,
  demonstrative and relative, and the `einer` pillar's `einem` and `eines`
  (*mit einem der Kinder*, *eines der Häuser*) have a Masc and a Neut cell
  each. Accusative `sie`, genitive `ihrer`, and der-series `die` and `deren`
  are 3sg Fem or plural. At a sentence's start, where the capital no longer
  tells them apart, `Sie`, `Ihnen` and `Ihrer` may also be formal.

Navigation reaches only cells: varying case from `er` reaches `ihm` Masc,
and from `das` reaches `dem` Neut of the same pronoun type. Varying case
from `die` reaches `der` Dat.Fem.Sg, because the feminine has a cell of its
own there.

Dumgen reads the referent from the sentence. When the sentence cannot settle
it, Dumgen reads the sentence before and the sentence after. If those don't
settle it either, the occurrence attests the form's Syncretism
([ADR 0046](./0046-generate-a-syncretism-for-each-form-only-its-referent-resolves.md)),
the generated unit that keeps the features its cells agree on and names the
others as open. A Spec Record judges by its own sentence. A wrong cell is
corrected by moving the occurrence (ADR 0043), and an uncertain encounter
never merges reviewed members.

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

**Elsewhere `derer` spells `deren`.** In an occurrence where `deren` could
stand alone instead, `derer` is a Licensed Variant of that `deren` cell. That covers the
relative (*die Opfer, derer wir gedenken*) and the demonstrative pointing back
(*Die Kartons stehen herum; wir wollen uns derer entledigen*). The test is a
swap. If `deren` fits, the learner who clicks `derer` sees `deren`, relative
or demonstrative, with `derer` marked as its accepted spelling. If only
`derer` fits, they see the `derer` Lemma, *of those (who …)*. `deren` stays
the Canonical Form, because it is the one form every pointing-back use
accepts: before a noun or a number only `deren` stands (*deren Freundin*,
*deren viele*). Attributive and standalone `deren` are one Lemma, so the swap
is judged per occurrence, and an attributive occurrence has no `derer`
spelling.

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

Amended on 2026-10-01: personal `ihm` and `seiner` and der-series `dem` and
`dessen` were two Lemmas each, a Masc and a Neut cell, and the referent picked
one, often from another sentence. The referent now chooses only between cells
that differ in who is meant, and those four forms are one cell each, with
gender null. A learner sees one word, the dative or genitive of `er` and
`es`; two cards with the same form, sound and use looked like a duplicate, and
the masculine cell's gloss "him" was wrong for *der Tisch*. Decided on
[#743](https://github.com/clockblocker/texteater/issues/743).

Amended on 2026-10-01: formal `Sie`, `Ihnen`, `Ihrer` and the possessive `Ihr`
were person 2 with number Plur, a mix no grammar or treebank uses, and a
future verb agreement check would have rejected every formal-address
sentence. They are person 3 now. Decided on
[#743](https://github.com/clockblocker/texteater/issues/743).

Amended on 2026-10-01: pronominal `einem` and `eines` were two cells each in
the `einer` pillar, a Masc and a Neut one. They serve both genders alike, so
they are one cell each with gender null, as `ihm` and `dem` are. Decided by
the user, extending
[#743](https://github.com/clockblocker/texteater/issues/743)'s ruling 1.

Amended on 2026-10-01: attributive `dessen` and `deren` were Lemmas of their
own beside the standalone cells, kept apart by `extPos` DET. The two uses
mean the same to a learner, and their forms are the same cell, so they are
one Lemma each now, and `extPos` left German PRON. The `derer` licence, a
property of the standalone Lemma, became the per-occurrence swap test above.
Attributive `wessen` stays its own invariant Lemma, cited apart from `wer`.
Decided on [#766](https://github.com/clockblocker/texteater/issues/766).

Amended on 2026-10-01: a pronoun Surface marked its reflexive use (`reflex`
Yes), and informal address carried `polite` Infm. Neither split a Lemma: the
sentence shows the reflexive use, and person 2 says informal address. Infm
was set on some cells and not others, which split `dich` by accident and left
the possessives `dein` and `euer` inconsistent. A lexical reflexive stays a
member of its verb. Decided on
[#766](https://github.com/clockblocker/texteater/issues/766).

Amended on 2026-10-01: free `sich` and its reciprocal use are stated here.
ADR 0018 held them until a rewrite on 2026-08-30 cut them, and ADR 0044 did
not restate them. Decided on
[#237](https://github.com/clockblocker/texteater/issues/237) and
[#238](https://github.com/clockblocker/texteater/issues/238).

Amended on 2026-10-02: the cells that differ in gender alone are split
again. On 2026-10-01 (#743) `ihm`, `seiner`, `dem`, `dessen`, `einem` and
`eines` became one cell each with gender null, and navigation reached each
from both genders. A sentence that names the referent could no longer record
it, and number and politeness still needed a guess. Each is a Masc and a
Neut cell again, the navigation exception is gone, and a referent no text
settles attests a generated Syncretism instead of the most probable cell
(ADR 0046). Decided by the user on
[#829](https://github.com/clockblocker/texteater/issues/829).

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
- Formal `Sie` as person 2, the addressee, with number null, as UD's German
  guidelines have it. Rejected on 2026-10-01 (#743): `polite` Form already
  names the addressee, and the grammars, the verb, `sich` and `Ihr` all go
  by the 3rd person plural.
- A Core value set such as Masc|Neut for `ihm`. Rejected (#606): navigation
  compares Core values literally, so a set matches neither `er` nor `es`. A
  Syncretism covers the open referent instead (ADR 0046).
- Two cells each for `ihm`, `seiner`, `dem` and `dessen`, with the referent
  always picking and the most probable cell winning when no text settles it.
  Chosen on #606, rejected on 2026-10-01 (#743) and again on 2026-10-02
  (ADR 0046): the guess showed the learner a gloss the text did not support.
- One cell each, with gender null, for `ihm`, `seiner`, `dem`, `dessen`,
  `einem` and `eines`, reached by navigation from both genders. Chosen on
  2026-10-01 (#743), rejected on 2026-10-02: a sentence that names the
  referent could not record it, and the null was the one wildcard navigation
  allowed.
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
  Variant of standalone relative and demonstrative `deren`, and the cells
  that differed in gender alone became one each (#743). On 2026-10-02 they
  were split again, and a Syncretism stands for a referent no text settles
  (ADR 0046).
