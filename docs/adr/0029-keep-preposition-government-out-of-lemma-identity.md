---
status: accepted
---

# Keep preposition government out of Lemma identity

A lexically governed preposition is valency, not identity. `warten auf` is
still `warten`, `bitten um` is still `bitten`, and `stolz auf` is still
`stolz`. No VERB Core Feature `hasGovPrep` exists in any language, and no Kind
has a governed-preposition Core Feature. Dropping the preposition gives the
same word without its complement, unlike `hasSepPrefix` and
`lexicallyReflexive`, which pick a different headword (`aufpassen` is not
`passen`, `sich erinnern` is not `erinnern`).

`lexicallyReflexive` names the case its reflexive takes, Acc or Dat, fixed per
word: `sich erinnern` is Acc (*ich erinnere mich*), `sich etwas vorstellen`
Dat (*ich stelle mir etwas vor*). So `sich vorstellen` (Acc, 'introduce
oneself') and `sich etwas vorstellen` (Dat, 'imagine') are two Lemmas, apart
from `vorstellen`. A reflexive verb is a Lemma of its own with a "sich X"
Canonical Form. Merging it into its base verb was rejected, and so was
recording the mark on a Reading or in Knowledge.

Government lives in two places, neither of them the Lemma
([ADR 0034](./0034-store-valency-as-e-valbu-frames-on-the-reading.md)): the
Reading's Valency Frame holds the type-level claim, and the Attestation's
`valencyEvidence` names the member that realizes a slot in one occurrence.
The governed preposition stays an Attestation member of its governor, a VERB,
ADJ, NOUN or Locution, so clicking `auf` in `wartet auf den Zug` or `stolz auf
seinen Sohn` opens the governor.

A German pronominal adverb (`darauf`, `dafür`, `damit`, the `wo(r)-` and
`hier-` compounds) is its own single-member ADV Lexeme. It is never a governed
member of the governing word, and never a fixed Locution member with its
governor outside a genuine idiom. The government relation stays on the
governor. A split pronominal adverb, or a split `da …` or `wo …` with `hin` or
`her`, is one target of the whole adverb, with two members: *Da weiß ich
nichts von* gives [Da, von] ADV `davon`, and *Wo gehst du hin?* gives [Wo,
hin] ADV `wohin`. Split or not, it never joins the word that governs its
preposition. The dumcorpus Rule is `de/split-adverb-is-one-target`.

A reciprocal pronominal adverb, a preposition joined to `einander`
(`miteinander`, `aufeinander`, `voneinander`), is an ADV Lexeme of its whole
form in the same way. It never splits into an ADP and PRON `einander`:
`aufeinander warten` gives [warten] VERB and [aufeinander] ADV.

A `wo(r)-` form, like `wo`, `wie` and `warum`, is one Lemma whose
interrogative and relative uses are two Readings, since Duden gives each
w-adverb one headword with an interrogative and a relative sense. German ADV
carries no `pronType`, because on an adverb the value splits no Lemma. The
series a learner meets (`da`, `wo`, `irgendwo`, `nirgendwo`; `dann`, `wann`,
`irgendwann`, `nie`) shows in each Reading's series marker, and whether an
adverb is closed-class is a lookup by spelling in dumcorpus's Authored
Inventory, so nothing would read the feature. PRON and DET keep `pronType`,
where it is identity. The demonstrative and negative adverbs stay authored
([ADR 0021](./0021-close-routes-in-dumgen-and-author-closed-class-inventories-in-dumcorpus.md)).
The user ruled on this and on the markers below in
[#595](https://github.com/clockblocker/texteater/issues/595).

One set of series markers runs through the authored adverbs, pronouns and
determiners: interrogative ❓, relative 🧩, `irgend-` ❔, negative 🚫 and
total 🌐. A demonstrative carries none. The marker comes before the emoji of
what the word asks about or stands for: 📍 place, 🕰 time, 🔧 manner. So
`wann` is ❓🕰, `irgendwann` ❔🕰, `nie` 🚫🕰, `nirgends` 🚫📍 and `keineswegs`
🚫🔧, and `dann` and temporal `da` are 🕰. The time emoji is 🕰, not ⏰. The
`hier-` pronominal adverbs carry no marker, so `hierfür` is 🎁 like `dafür`,
and `so` is 🔧. Causal `darum` and `daher` ('that's why') are 🤔, the emoji
of `warum`, with no marker, since they are demonstrative. A reciprocal
pronominal adverb puts 🤝, the Reading of `einander`, before its
preposition's emoji, the way ❓ comes first on the `wo(r)-` forms:
`miteinander` is 🤝🔗 and `aufeinander` 🤝🔝.

On PRON and DET, the relative pronouns and relative `welcher` are 🧩, while
🔗 belongs to infinitive `zu` and the preposition `mit`. The total
determiners (`alle`, `jeder`, `sämtliche` and their kin) and PRON `sämtliche`
are 🌐, like the total pronouns. DET `irgendein` and `irgendwelcher` are ❔,
and PRON `beide` is 2⃣, like DET `beide`. The perfect auxiliaries `haben` and
`sein` are both 🏁.

## Consequences

- A verb with and without its governed preposition is one Lemma, so senses
  such as `es geht um` and `gehen` are separate Readings under the Emoji
  Description, not separate Lemmas.
