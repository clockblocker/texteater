---
status: accepted
---

# Treat modals as verbs and confine AUX to grammar Readings

German modals (`dürfen`, `können`, `mögen`, `müssen`, `sollen`, `wollen`) are
VERB Lemmas. A modal is one identity whether it governs an infinitive (`kann
schwimmen`) or an object (`mag Schokolade`); governing an infinitive is a role
inside a verbal unit, not a second Lemma. This deviates from Universal
Dependencies, which tags them AUX. A learner reads a modal for its meaning, so
it takes the reader-facing route. A modal's VERB Core carries no `verbType`:
no other verb shares a modal's Canonical Form, so the value would split no
Lemma and only repeat what the Canonical Form says. dumcorpus's list of the
six modals says which VERBs are modals.

AUX is `sein`, `haben` and `werden` in grammatical function only, plus the
recipient-passive and causative auxiliaries below. There is no lone
auxiliary: standing alone, these verbs are ordinary VERB Lemmas with their
own meaning (copular `sein`, `haben` "to own", `werden` "to become"). A word is
AUX only as the auxiliary member of a verbal unit, so an auxiliary is never a
classification target on its own and a click on one selects the verb it serves.
Perfect, future, voice and passive describe the whole verbal Surface under
[ADR 0022](./0022-describe-whole-verbal-surfaces-compositionally.md) and stay
null on an auxiliary's own Surface.

The AUX catalog is a closed set of grammar-explaining Readings, one per
grammatical use of a verb (for example `sein` as Perfekt auxiliary and `sein`
as Modalpassiv auxiliary), with every form an authored Surface under each
Reading it can serve. The serving verb's form decides the Reading, not the
spelling. A reader reaches an AUX Reading from the unit's Surface explanation,
never from the text. Per-form AUX Lemmas such as `ist` and `bin` do not exist.
`sein` with a participle outside the perfect is the copula VERB and the
participle an ADJ
([ADR 0036](./0036-make-adjectival-german-participles-adj-linked-to-their-verb.md)),
so no AUX Reading covers the Zustandspassiv and `passive` has no `State`
value.

The recipient passive is AUX: `bekommen`, `kriegen` and `erhalten` with a
Partizip II that contributes nothing lexical (`Sie bekommt das Paket
geliefert`) are auxiliary members under one authored Reading on the AUX Lemma
`bekommen`, and `passive` is `Recipient` beside `Process`. The
lexical use (`Sie bekommt ein Paket`) and the resultative use (`Sie bekommt
das Glas geöffnet`, manages to open it) keep `bekommen` as the
VERB; only the sentence decides, so both carry gold. Verbs that add a meaning
beside a construction (`sich lassen`, `gehören` with a participle, `brauchen`,
`scheinen`, `drohen`, `versprechen`, `pflegen` with `zu`, copular `bleiben`)
are VERB like the modals; Funktionsverbgefüge are Collocation Locutions
(ADR 0039).

Causative `lassen` is AUX the same way. When the clause names nobody who does
the action and `lassen` is not the modal-passive `sich lassen` ('can be
done'), `lassen` joins the infinitive's target under one authored grammar
Reading, and German `voice` is `Cau` beside `Pass`, with `passive` null:
*Ich lasse mir die Haare schneiden* gives `[lasse, schneiden]` VERB
`schneiden` with `voice: Cau`, and *Sie hat den Zaun reparieren lassen* gives
`[hat, reparieren, lassen]`. A free dative or a free `sich` leaves it a
causative: *Sie lässt sich die Haare schneiden*, and *Er lässt sich
untersuchen* ('has himself examined'), where `sich` alternates with *ihn*.
The modal-passive *lässt sich öffnen* is the VERB `sich lassen` over `[lässt,
sich]`, with the infinitive a target of its own, as the list of VERBs with a
meaning of their own above says. Everything else is the VERB `lassen` with
the infinitive as a target of its own: a doer in any form (*lässt ihn
reparieren*, *lässt es von ihm reparieren*), permissive *lässt die Kinder
spielen* and *lass uns*. With an intransitive infinitive, the accusative is
its doer (*lässt den Zaun verrotten*, *ließ die Tasse fallen*). All of this
holds unless the combination is an Idiom
([ADR 0039](./0039-split-phrasemes-into-locutions-and-sayings.md)): *X
lassen* is one only when the idiom test holds and Duden gives the combination
its own headword or an idiom line, so a usage example under one sense of
*lassen* does not count, and literal uses stay apart. The user ruled the
causative line on [#721](https://github.com/clockblocker/texteater/issues/721)
and the free `sich`, intransitive infinitive, Idiom exception and
lexicalized combinations (*liegen lassen*, *fallen lassen*) on
[#723](https://github.com/clockblocker/texteater/issues/723#issuecomment-5928789497).

Membership, occurrence alignment and coverage contracts in ADR 0003 are
unchanged. The modal and AUX rulings are recorded on
[the lab scope decision](https://github.com/clockblocker/texteater/issues/502),
[the auxiliary schema decision](https://github.com/clockblocker/texteater/issues/504)
and [the AUX Readings decision](https://github.com/clockblocker/texteater/issues/507).
