---
status: accepted
---

# Record comparability on ADV and ADJ Lemmas

German and English ADV and ADJ mark Degree on the Surface. Many of these words
have no comparison forms: *hier*, *heute*, *tot*, *entzwei*, *here*. Their
Surfaces carry no Degree, and their inflection is `null`. Read on its own, a
`null` inflection could mean three things: the word can't be compared
(*hier*), it is a citation of a word that can (*mild*), or a comparable word
was left unmarked (*schnell*). Without a way to tell these apart, Grundform
could not accept *hier* or *mild* unless it carried a false `degree: Pos`.

**Comparability is a Core Feature of German and English ADV and ADJ Lemmas.**
A Lemma is comparable when it has comparison forms of its own. Inflected forms
count (*schneller*, *faster*), and so do the suppletive forms a dictionary
lists (*gern → lieber*, *good → better*). Periphrastic *more* or *most* is a
separate word and does not make a Lemma comparable. Neither does a rare or
colloquial form (*töter*, *toter*). Comparability is a fact about one Lemma,
like a noun's gender, so it lives on the Lemma. Where one spelling has two
Duden headwords that differ in comparing, they are two Lemmas
([ADR 0036](./0036-make-adjectival-german-participles-adj-linked-to-their-verb.md)).

**Comparability decides Degree on every Surface.**

- A comparable Lemma's Surface always marks Degree. That includes `Pos` in a
  citation (*mild*), in predicative use (*wird mild*) and in adverbial use
  (*singt laut*), as UD HDT marks every ADJD.
- A non-comparable Lemma's Surface never marks Degree. A non-comparable ADV
  has no inflection. A non-comparable ADJ marks case, gender and number only
  when attributive (*der tote Mann*), and has no inflection otherwise.

Every state has exactly one encoding. Dumling rejects *hier* with
`degree: Pos` and *schnell* without Degree.

**Grundform follows from the Lemma.**

- A comparable ADV is Grundform with Degree `Pos`. A comparable ADJ is
  Grundform with `Pos` and unmarked case, gender and number.
- A non-comparable ADV is Grundform by its spelling alone.
- A non-comparable ADJ is Grundform by its spelling when it has no inflection.
  An attributive form (*toten*) is not Grundform.

dumcorpus fails a record that states `grundform` when the Grundform
assessment returns an error, so the verdict never goes unchecked.

**Why this sits in Dumling.** Dumling decides which feature values are
well-formed ([ADR 0041](./0041-judge-dumling-fields-by-the-learner-and-by-classification.md)),
and it can't decide Degree without knowing whether the Lemma can be compared.
A fact about one Lemma that decides which values its own Surfaces may carry
belongs on the Lemma, even if no click or drill-down reads it. Tables that
cover a whole language, such as the ADP Case Table and the article paradigm,
stay in dumcorpus.

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

- Amends ADR 0041: a per-Lemma fact that decides which values its own
  Surfaces may carry belongs on the Lemma.
- Amends [ADR 0032](./0032-choose-core-features-per-route-for-the-learner.md):
  German and English ADV and ADJ carry comparability in Core.
- Amends the Grundform rules of
  [dumcorpus ADR 0001](../../battery/dumcorpus/docs/adr/0001-assess-grundform-with-language-owned-rules.md):
  a non-comparable ADV or ADJ with no inflection is assessed by its spelling.
- A Locution route borrows its Lexeme route's inflection and Grundform rule
  ([ADR 0039](./0039-split-phrasemes-into-locutions-and-sayings.md)). The ADV
  and ADJ Locution routes therefore take the same Core Feature.
- dumcorpus's `de/comparability-is-lexical` Rule leans on this ADR for its
  examples.
- Dumgen supplies comparability.
- Hebrew is unchanged.
