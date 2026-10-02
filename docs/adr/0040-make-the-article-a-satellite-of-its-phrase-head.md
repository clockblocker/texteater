---
status: accepted
---

# Make the article a satellite of its phrase's Head

[ADR 0035](./0035-attest-articles-and-fused-words-segment-by-segment.md) made
the article a member of its noun's Attestation, so a click on `der`, `the` or
the `m` of `im` opens the noun. It also recorded the article twice: as that
member and as the Surface feature `article: Definite | Indefinite | None` on
German and English nouns. The feature caused every problem that followed:

- English `books` became three Surfaces that look the same, because English
  displays no article.
- Nothing checked the English feature, so *a books* validated.
- `None` meant "owns no article", so it lumped bare `Haus` with `kein Haus` and
  `diesem Haus`.
- An article with no noun to own it (*den roten*, *the rich*) had no rule.
- ADR 0035 rejected an English article of its own because the noun's feature
  would count it twice, but ADR 0035 introduced that English feature.

What a learner needs from an article decides the model. Articles are so
common that a click resolving to DET `dem` stops teaching anything after the
first session. The article still has to be reachable when it hides in a
fused word (`im`, Hebrew `בבית`). German inflects the article together with
its noun, so the occurrence shows the pair. The DET keeps its own Lemma and
Reading for the learner to drill down to from other Notes. A German noun's
header shows its article so the learner remembers the gender, and that
article comes from the Lemma's gender.

**The article is a satellite, not a feature.** German and English common
nouns have no `article` feature. A noun Surface is the noun's own form:
`books` is one Surface. The article is a member of the Attestation with the
Member Role Article. Agreement is checked on the Attestation: the article's
spelling, read through its Fusion or Shorthand (`m` is `dem`, `'ne` is
`eine`), must name a cell of its paradigm for the Head's case, number and
gender. *ein Häuser* and *a books* fail that check.

**Which words are articles.** Only the forms of German `der` and `ein`,
English `the` and `a`/`an`, and Hebrew `ה` are articles, with their fused and
shortened pieces. `kein`, `dieser`, `mein` and every other determiner carry
meaning of their own and stay DET units: `kein Haus` is `[kein]` DET and
`[Haus]` NOUN. Words spelled like articles that do other work keep their own
Lemmas: demonstrative and relative `der` are PRON (*Der kommt nicht*), and
`the` in *the more, the merrier* is ADV.

**The Head of the phrase owns the article.** The Head is usually the noun,
and a noun owns the article that opens its phrase across adjectives and
numerals, as before: `Die drei Mädchen` attests `[Die, Mädchen]`. When the
noun is elided, the word standing in for it is the Head and owns the article,
as UD's promotion attaches it:

- `Ich nehme den roten` attests ADJ `rot` over `[den, roten]`.
- `the rich` attests ADJ `rich` over `[the, rich]`. UD tags an adjective
  heading a nominal ADJ.
- `der meine` attests ADJ `meine` over `[der, meine]`, and `der eine`
  attests ADJ `eine` the same way.
- `das alte Berlin` attests PROPN `Berlin` over `[das, Berlin]`. A proper
  noun cited bare owns the article it takes in a sentence. Core
  `article: Definite` stays only on names cited with their article
  (`die Schweiz`), where it says how the name is cited.

Hebrew marks definiteness on each word of the phrase, so its `ה` belongs to
the word it prefixes, noun or adjective (`הבית הגדול`), as ADR 0035 has it.

A nominalized adjective is a NOUN, as a substantivized participle already is:
German capitalizes it (§57) and STTS tags it `NN`. `der Alte`, `das Gute` and
`die Reichen` own their articles like any noun. Their endings follow the
determiner (`der Alte`, `ein Alter`, `kein Alter`), and the Surface's letters
record the ending. An adjective whose noun is elided stays lowercase (§58.1)
and stays ADJ.

**Drilling down to the DET.** A click never resolves to an article's DET
Lemma. The DET cell is derived from the satellite's spelling and the Head's
case, number and gender: `dem` before `Wald` is `dem` Dat.Masc.Sg
([ADR 0032](./0032-choose-core-features-per-route-for-the-learner.md)). The
DET's Note reaches its occurrences through the Article satellites that derive
to it.

**Display.** A German noun's header takes its article from the Lemma's
gender: `der Wald`, and `die Leute` for a plural-only noun. An occurrence
shows the members it attests (`im Wald`, `dem Wald`). English displays no
article in a header.

**Shared and hidden articles.** An article that serves two Heads belongs to
the closest one. The other Head records it as shared article evidence with
Partial coverage: `der Aufstieg und Abstieg`. A hidden component such as the
`ה` of `בבית` stays hidden article evidence with Partial coverage. Both now
apply to any Head, not only nouns.

**DegreeMarker.** The word that marks an analytic comparative or superlative
is a satellite, like the article: a member, not a Head, of the Lexeme whose
degree it marks. No Member Role records it
([ADR 0041](./0041-record-in-dumling-only-what-routing-and-drill-down-consume.md));
the Lexeme's Surface carries the degree:

- `Mina reist am liebsten` attests ADV `gern` (Sup) over `[am, liebsten]`,
  and `am schnellsten` attests ADJ `schnell` (Sup) the same way.
- `most beautiful` attests ADJ `beautiful` (Sup) over `[most, beautiful]`,
  and `more beautiful` is Cmp.

Before a superlative, `am` is one DegreeMarker member and stands for no other
words, because it no longer means `an dem`. In `am Fenster`, `am` still splits
into the Segments `a` (standing for `an`) and `m` (standing for `dem`). Intake
decides between the two readings by grammar, as it does for Hebrew prefixes. A
Locution applies only where the meaning has moved away from the superlative.
The Hebrew owner decides whether `הכי` and `יותר` are DegreeMarkers and
whether noun `definite` survives beyond the construct state.

## Considered Options

- Keeping `article` on the Surface (ADR 0035). Rejected for the reasons
  above. The member already records the article, and the feature only
  duplicated it.
- Moving `article` to the Attestation as a feature. Rejected: the Article
  member states the same fact.
- Making an article without a noun a DET of its own, as `das alte Berlin` and
  `der meine` were. Rejected: a click on it teaches as little as a click on
  `den` in `den roten Faden`, and German inflects `den roten` as a pair just
  as it does `dem Wald`.
- Making `den roten`, `the rich` or `am schnellsten` Locutions. Rejected: each
  has one Head, and every adjective forms them. They would give one Lemma
  per adjective and move the superlative off grammatical navigation.
- Splitting `am` before a superlative. Rejected: `m` would derive a DET cell
  with no noun to agree with, and the `am` Fusion entry already says the word
  is no Fusion there.
- Core gender on every German proper noun. Rejected on 2026-10-01 (#743): a
  surname names men and women alike, so *Herr* and *Frau Treibel* became two
  Lemmas, and a coined name took its gender from a pronoun in another
  sentence.

## Consequences

- This amends ADR 0035's `A noun owns its article` section and its rejection
  of an English article of its own. It adds DegreeMarker to the satellites of
  [ADR 0039](./0039-split-phrasemes-into-locutions-and-sayings.md), and it
  amends ADR 0032's article derivation, which now reads the
  satellite's spelling instead of a noun feature.
- Dumling drops `article` from the German and English NOUN inflectional
  features. The Surface check that the feature names an article form becomes
  an Attestation check that the Article member agrees with its Head, for
  every Head and in German and English alike.
- Dumgen drops the article feature question. Its noun-article resolution
  judges the article of any Head. Intake decides whether `am` splits, and a
  whole `am` before a superlative is a valid Segment.
- In dumspec, `de/noun-article-feature` is retired and
  `de/possessive-after-article` reverses. `de/proper-noun-article` gives a
  bare-cited name the article that opens its phrase, and nominalized
  adjectives join the substantivized participle rule. The Reviewed
  `am liebsten` record changes from `[a, m, liebsten]` to `[am, liebsten]`.
- tf-demo's German noun header derives its article from the Lemma's gender.
- Every change under `battery/dumgen/src` recompiles the relation verdict.

Amended by [ADR 0041](./0041-record-in-dumling-only-what-routing-and-drill-down-consume.md): the article is identified by `articleEvidence`, not a Member Role, and the agreement check and DET-cell derivation live in dumspec.

Amended on 2026-09-30: the `der-` part of `derselbe` and `derjenige` belongs
to the word, not an article
([#618](https://github.com/clockblocker/texteater/issues/618)). Both are DETs
written with their article inside (`demselben`, `desselben`), so the article
rule above never splits them, and their noun gets no article from them. A
fused piece counts the same way: in *am selben Morgen*, `am` is still `a`
(`an`) and `m` (`dem`), but `m` is the `dem-` of `demselben`, so `[m, selben]`
attests DET `derselbe` with Full coverage and `Morgen` has no Article member.
DET Attestations carry no article evidence, so the Fused piece creates no
article identity inside `derselbe`.

Amended on 2026-10-01: a German surname or coined name has no Core gender.
One surname names a man and a woman alike (*der* and *die junge
Schwarzkopf*), and a coined name such as Kafka's *Odradek* gets a gender only
from what refers to it. An initial standing for a surname, such as *K.*,
counts as one, and so does a full name, a first name plus a surname
(*Gregor Samsa*, *Josef K.*). The name's singular Surface marks the gender
an owned article or an agreeing adjective shows, as an adjectival noun's does
(`der Reisende`), and it must mark it wherever the name owns its article, so
the agreement check never passes an unmarked gender: `der junge Schwarzkopf`
attests PROPN `Schwarzkopf` over `[der, Schwarzkopf]` with Surface gender
Masc. Without such an article or adjective the Surface's gender is null.
First names on their own, places, rivers, brands with an established gender
and work titles keep Core gender (*Anna*, *das alte Berlin*, *der Rhein*,
*das iPhone*). A work title names one work and has one gender by convention,
even when it is a full name: a title named after its hero takes his gender,
so *„Tonio Kröger“* is Masc, like *der „Werther“*. Decided on
[#743](https://github.com/clockblocker/texteater/issues/743); full names were
added the same day, and work titles on
[#825](https://github.com/clockblocker/texteater/issues/825#issuecomment-5932162619).

Amended on 2026-10-02: a proper noun's Core gender may be null. Its Surface
takes gender from what the sentence shows: an owned article or an agreeing
adjective. A gender that usage or a dictionary fixes may stay in Core
(*der Rhein*, *das iPhone*). A brand with no established gender (*eBay*: no
Duden entry, used without an article) has none in Core, like a coined name.
Decided by the user on 2026-10-02
([#595](https://github.com/clockblocker/texteater/issues/595)).

Amended on 2026-10-02: a Locution NOUN owns its article as a Lexeme NOUN
does. It is the Head of its phrase, and ADR 0039 already gives it Core gender
so a host can show its article: *This exam was a walk in the park* attests
`walk in the park` over `[a, walk, in, the, park]`, with `a` as its owned
article and the inner `the` one of its fixed words. Dumling had allowed article
evidence only on Lexeme routes, a gap rather than a decision. Decided by
agents under the user's delegation on 2026-10-02
([#828](https://github.com/clockblocker/texteater/issues/828)).

Amended on 2026-10-02: `der meine` attested the possessive PRON over
`[der, meine]`, as the weak form of its Nom.Masc.Sg cell. After an article
the weak possessive is ADJ now, as `beide` is in *die beiden*. It is cited in
its weak form after `der`, as Duden's headword `meine` (*Ist es der meine?*)
and the ordinal `erste` are: `der meine` attests ADJ `meine` over
`[der, meine]`, `der meinige` ADJ `meinige` and `der eine` ADJ `eine`. The
possessive PRON has no weak forms. Decided by agents under the user's
delegation on 2026-10-02
([#595](https://github.com/clockblocker/texteater/issues/595)).

Amended on 2026-10-02: a change under `battery/dumgen/src` no longer
recompiles the relation verdict. The legacy Dumgen moved, frozen, to
`battery/legacy-dumgen`, and tf-demo's verdict compiler
(`app/tf-demo/tooling/compile-relation-verdict.ts`) hashes that copy's `src`
together with Dumling's and Dumrel's. Changes to Dumling and Dumrel still
recompile the verdict, but the new Dumgen's do not. Recorded on
[#839](https://github.com/clockblocker/texteater/issues/839).

Amended on 2026-10-02: no change recompiles a relation verdict any more.
tf-demo's relation-verdict gate is deleted: its verdict compiler, the compiled
verdict and the `check:relation-policy` check. The Knowledge generation path
the verdict approved now refuses every run, and the Luna transport it
fingerprinted is gone. Relation publication still fails closed: with no
reviewed verdict, no relation kind is published. Decided by the user on
2026-10-02 ([#850](https://github.com/clockblocker/texteater/issues/850)).
