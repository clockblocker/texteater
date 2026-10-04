---
status: accepted
---

# Keep preposition government out of Lemma identity

A lexically governed preposition is valency, not identity. `warten auf` is
still `warten`, `bitten um` is still `bitten`, and `stolz auf` is still
`stolz`. The VERB Core Feature `hasGovPrep` is removed in every language, and
no Kind gains a governed-preposition Core Feature. Dropping the preposition
gives the same word without its complement, unlike `hasSepPrefix` and
`lexicallyReflexive`, which pick a different headword (`aufpassen` is not
`passen`, `sich erinnern` is not `erinnern`).

Government lives in two places, neither of them the Lemma
([ADR 0034](./0034-store-valency-as-e-valbu-frames-on-the-reading.md)): the
Reading's Valency Frame holds the type-level claim, and the Attestation's
`valencyEvidence` names the member that realizes a slot in one occurrence.
The governed preposition stays an Attestation member of its governor, a VERB,
ADJ, NOUN or Locution, so clicking `auf` in `wartet auf den Zug` or `stolz auf
seinen Sohn` opens the governor.

A German pronominal adverb (`darauf`, `dafür`, `damit`, the `wo(r)-` and
`hier-` compounds) is its own single-member ADV Lexeme (a `wo(r)-` form is
one Lemma whose interrogative and relative uses are two Readings), never a
governed member of the governing
word and never a fixed Locution member with its governor outside a genuine
idiom. The government relation stays on the governor. A reciprocal pronominal adverb, a preposition joined to `einander`
(`miteinander`, `aufeinander`, `voneinander`), is an ADV Lexeme of its whole
form in the same way. It never splits into an ADP and
PRON `einander`: `aufeinander warten` gives [warten] VERB and [aufeinander]
ADV.

Consequences: stored VERB Lemmas that differed only by `hasGovPrep` collapse
into one Lemma, so their Readings merge under the Emoji Description that
already separates senses such as `es geht um` from `gehen`.

Until ADR 0034, only verbs took in their governed preposition as a member,
and government was stored as the Attestation's `governedPrepositionEvidence`
and the Reading's `governedPrepositions` Knowledge aspect.

Amended on 2026-09-28 (#717): a split pronominal adverb, or a split `da …`
or `wo …` with `hin` or `her`, is one target of the whole adverb, with two
members. *Da weiß ich nichts von* gives [Da, von] ADV `davon`, and *Wo gehst
du hin?* gives [Wo, hin] ADV `wohin`. A pronominal adverb still never joins
the word that governs its preposition. The dumcorpus Rule is
`de/split-adverb-is-one-target`.

Amended on 2026-10-01: the reciprocal pronominal adverbs are stated here.
They were decided on [#238](https://github.com/clockblocker/texteater/issues/238)
on 2026-08-26, and no ADR held them.

Amended on 2026-10-01: a `wo(r)-` form, like `wo`, `wie` and `warum`, was two
Lemmas, `pronType` Int and Rel by use. Duden gives each w-adverb one headword
with an interrogative and a relative sense, so the two uses are Readings of
one Lemma, and Int and Rel left German ADV; Dem, Ind and Neg stay. Decided on
[#766](https://github.com/clockblocker/texteater/issues/766).

Amended on 2026-10-01: `lexicallyReflexive` names the case its reflexive
takes, Acc or Dat, fixed per word: `sich erinnern` is Acc (*ich erinnere
mich*), `sich etwas vorstellen` Dat (*ich stelle mir etwas vor*). So `sich
vorstellen` (Acc, 'introduce oneself') and `sich etwas vorstellen` (Dat,
'imagine') are two Lemmas, apart from `vorstellen`. A reflexive verb stays a
Lemma of its own with a "sich X" Canonical Form. Merging it into its base
verb was rejected, and so was recording the mark on a Reading or in
Knowledge. Decided on
[#766](https://github.com/clockblocker/texteater/issues/766).

Amended on 2026-10-02: German ADV carries no `pronType`, so Dem, Ind and Neg
left it too. On an adverb the value split no Lemma. The series a learner
meets (`da`, `wo`, `irgendwo`, `nirgendwo`; `dann`, `wann`, `irgendwann`,
`nie`) shows in each Reading's marker (❓ 🧩 ❔ 🚫 👉), and whether an adverb
is closed-class is a lookup by spelling in dumcorpus's Authored Inventory, so
nothing read the feature. PRON and DET keep `pronType`, where it is
identity. The demonstrative and negative adverbs stay authored
([ADR 0021](./0021-close-routes-in-dumgen-and-author-closed-class-inventories-in-dumcorpus.md)).
Decided by the user on
[#595](https://github.com/clockblocker/texteater/issues/595).

Amended on 2026-10-02: one set of series markers runs through the authored
adverbs, pronouns and determiners. Interrogative is ❓, relative 🧩,
`irgend-` ❔, negative 🚫 and total 🌐, and a demonstrative carries none. The
marker comes before the emoji of what the word asks about or stands for:
📍 place, 🕰 time, 🔧 manner. So `wann` is ❓🕰, `irgendwann` ❔🕰, `nie` 🚫🕰,
`nirgends` 🚫📍 and `keineswegs` 🚫🔧, and `dann` and temporal `da` are 🕰.
🕰 replaced ⏰ as the time emoji. The `hier-` pronominal adverbs dropped 👉,
so `hierfür` is 🎁 like `dafür`, and `so` is 🔧. On PRON and DET, the
relative pronouns and relative `welcher` took 🧩 from 🔗, which stays with
infinitive `zu` and the preposition `mit`. The total determiners (`alle`,
`jeder`, `sämtliche` and their kin) and PRON `sämtliche` took 🌐 from 💯, as
the total pronouns have it. DET `irgendein` and `irgendwelcher` took ❔ from
🔢, and PRON `beide` took 2⃣ from ✌, like DET `beide`. The perfect auxiliaries `haben` and `sein` are both 🏁. Decided by
the user on 2026-10-02
([#595](https://github.com/clockblocker/texteater/issues/595)).

Amended on 2026-10-02: a reciprocal pronominal adverb's Reading puts 🤝,
the Reading of `einander`, before its preposition's emoji, the way ❓ comes
first on the `wo(r)-` forms: `miteinander` is 🤝🔗 and `aufeinander` 🤝🔝.
Causal `darum` and `daher` ('that's why') are 🤔, the emoji of `warum`,
with no marker, since a demonstrative carries none. Decided by the user on
2026-10-02 ([#595](https://github.com/clockblocker/texteater/issues/595)).
