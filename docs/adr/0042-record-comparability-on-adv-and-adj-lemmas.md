---
status: accepted
---

# Record comparability on ADV and ADJ Lemmas

German and English ADV and ADJ mark Degree on the Surface. Many of these words
have no comparison forms: *hier*, *heute*, *tot*, *entzwei*, *here*. Their
Surfaces carry no Degree, and their inflection is `null`. A `null` inflection
could mean three things: the word can't be compared (*hier*), it is a citation
of a word that can (*mild*), or a comparable word was left unmarked
(*schnell*). The model couldn't tell these apart, so `checkIfGrundform`
returned an error for *hier* and *mild*. The only way to get `true` was to add
a false `degree: Pos`.

**Comparability is a Core Feature of German and English ADV and ADJ Lemmas.**
A Lemma is comparable when it has comparison forms of its own. Inflected forms
count (*schneller*, *faster*), and so do the suppletive forms a dictionary
lists (*gern → lieber*, *good → better*). Periphrastic *more* or *most* is a
separate word and does not make a Lemma comparable. Neither does a colloquial
form (*töter*). Comparability is a fact about one Lemma, like a noun's gender,
so it lives on the Lemma.

**Comparability decides Degree on every Surface.**

- A comparable Lemma's Surface always marks Degree. That includes `Pos` in a
  citation (*mild*), in predicative use (*wird mild*) and in adverbial use
  (*singt laut*), as UD HDT marks every ADJD.
- A non-comparable Lemma's Surface never marks Degree. A non-comparable ADV
  has no inflection. A non-comparable ADJ marks case, gender and number only
  when attributive (*der tote Mann*), and has no inflection otherwise.

Every state now has exactly one encoding. Dumling rejects *hier* with
`degree: Pos` and *schnell* without Degree.

**Grundform follows from the Lemma.**

- A comparable ADV is Grundform with Degree `Pos`. A comparable ADJ is
  Grundform with `Pos` and unmarked case, gender and number, as before.
- A non-comparable ADV is Grundform by its spelling alone.
- A non-comparable ADJ is Grundform by its spelling when it has no inflection.
  An attributive form (*toten*) is not Grundform.

dumcorpus fails a record that states `grundform` when Dumling's assessment
returns an error. The verdict can no longer go unchecked.

**Why this sits in Dumling.** [ADR 0041](./0041-record-in-dumling-only-what-routing-and-drill-down-consume.md)
lets a field into Dumling only if a click route or a Note's drill-down reads it,
and sends facts about a language to dumcorpus. No click reads comparability.
But ADR 0041 also makes Dumling the package that decides which feature values
are well-formed, and Dumling can't decide Degree without knowing whether the
Lemma can be compared. A fact about one Lemma that decides which values its own
Surfaces may carry belongs on the Lemma, even if no click or drill-down reads
it. Tables that cover a whole language, such as the ADP Case Table and the
article paradigm, stay in dumcorpus.

## Considered Options

- Read a `null` ADV or ADJ inflection as "the spelling decides", as
  `germanClosedClass` does. Rejected: *schnell* gets two encodings, and a
  comparable word that lost its Degree passes unnoticed.
- Keep comparability in dumcorpus and check records against it. Rejected:
  Dumling's schema would still accept *hier* with Degree and *schnell*
  without, and Grundform would still have to guess.
- Allow a null Degree in a present inflection. Rejected: the inflection must be
  non-empty, and a null Degree still doesn't say whether the Lemma can be
  compared.

## Consequences

- Amends ADR 0041: a per-Lemma fact that decides its own Surfaces'
  well-formed values passes the scope test.
- Amends [ADR 0032](./0032-choose-core-features-per-route-for-the-learner.md):
  German and English ADV and ADJ carry comparability in Core.
- Amends the Grundform rules, now
  [dumcorpus ADR 0001](../../battery/dumcorpus/docs/adr/0001-assess-grundform-with-language-owned-rules.md):
  a non-comparable ADV or ADJ with no inflection is assessed by its spelling.
- A Locution route borrows its Lexeme route's inflection and Grundform rule
  ([ADR 0039](./0039-split-phrasemes-into-locutions-and-sayings.md)). The ADV
  and ADJ Locution routes therefore take the same Core Feature.
- Reviewed dumcorpus records that break are demoted to Draft and reshaped
  with the others.
- Dumgen has to supply comparability. That work waits for the pipeline
  rewrite.
- Hebrew is unchanged.
- Decided in [#659](https://github.com/clockblocker/texteater/issues/659) on
  [#595](https://github.com/clockblocker/texteater/issues/595).

Amended on 2026-10-01: dumcorpus's `de/comparability-is-lexical` keeps one
example and leans on this ADR for the rest: *hier*, *heute*, *tot* and
*entzwei* are not comparable, *singt laut* marks `Pos`, *der tote Mann* is an
attributive non-comparable ADJ, and a rare or colloquial form (*töter*,
*toter*) makes nothing comparable. Where one spelling has two Duden headwords
that differ in comparing, they are two Lemmas
([ADR 0036](./0036-make-adjectival-german-participles-adj-linked-to-their-verb.md),
[#743](https://github.com/clockblocker/texteater/issues/743)).
