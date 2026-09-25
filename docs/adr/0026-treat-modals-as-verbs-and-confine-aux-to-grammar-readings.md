---
status: accepted
---

# Treat modals as verbs and confine AUX to grammar Readings

German modals (`dürfen`, `können`, `mögen`, `müssen`, `sollen`, `wollen`) are
VERB Lemmas with `verbType: Mod` in the Lemma core. A modal is one identity
whether it governs an infinitive (`kann schwimmen`) or an object (`mag
Schokolade`); governing an infinitive is a role inside a verbal unit, not a
second Lemma. This reverses the earlier product policy that classified modals
as Lexeme/AUX and deviates from Universal Dependencies, which tags them AUX. A
learner reads a modal for its meaning, so it takes the reader-facing route.

AUX is `sein`, `haben` and `werden` in grammatical function only. There is no
lone auxiliary: standing alone, these verbs are ordinary VERB Lemmas with their
own meaning (copular `sein`, `haben` "to own", `werden` "to become"). A word is
AUX only as the auxiliary member of a verbal unit, so an auxiliary is never a
classification target on its own and a click on one selects the verb it serves.
Perfect, future and passive describe the whole verbal Surface under
[ADR 0022](./0022-describe-whole-verbal-surfaces-compositionally.md) and stay
null on an auxiliary's own Surface.

The AUX catalog is a closed set of grammar-explaining Readings, one per
grammatical use of a verb (for example `sein` as Perfekt auxiliary and `sein`
as Modalpassiv auxiliary), with every form an authored Surface under each
Reading it can serve. The serving verb's form decides the Reading, not the
spelling. A reader reaches an AUX Reading from the unit's Surface explanation,
never from the text. Per-form AUX Lemmas such as `ist` and `bin` are retired.

The recipient passive joins AUX: `bekommen`, `kriegen` and `erhalten` with a
Partizip II that contributes nothing lexical (`Sie bekommt das Paket
geliefert`) are auxiliary members under one authored Reading on the AUX Lemma
`bekommen`, and `passive` gains the value `Recipient` beside `Process`. The
lexical use (`Sie bekommt ein Paket`) and the resultative use (`Sie bekommt
das Glas geöffnet`, manages to open it) keep `bekommen` as the
VERB; only the sentence decides, so both carry gold. Verbs that add a meaning
beside a construction (`sich lassen`, `gehören` with a participle, `brauchen`,
`scheinen`, `drohen`, `versprechen`, `pflegen` with `zu`, copular `bleiben`)
are VERB like the modals; Funktionsverbgefüge are Collocation Phrasemes.

This amends the AUX examples and the passive values in ADR 0022 and the "AUX copula" wording of the
classification criteria; membership, occurrence alignment and coverage
contracts in ADRs 0003 and 0004 are unchanged. The rulings are recorded on
[the lab scope decision](https://github.com/clockblocker/texteater/issues/502),
[the auxiliary schema decision](https://github.com/clockblocker/texteater/issues/504)
and [the AUX Readings decision](https://github.com/clockblocker/texteater/issues/507).

Amended on 2026-09-25 by [ADR 0035](./0035-make-adjectival-german-participles-adj-linked-to-their-verb.md):
`sein` with a participle outside the perfect is the copula VERB and the
participle an ADJ, so the Zustandspassiv AUX Reading is retired and `passive`
has no `State` value.
