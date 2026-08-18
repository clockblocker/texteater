# Rule About Verbs

This note fixes the German boundary between `VERB`, `AUX`, `ADJ`, and `NOUN`
for verb-shaped forms. It follows the conservative TIGER policy: productive
verbal identity wins inside perfect and passive constructions, while
adjectivally used and independently lexicalized participles use `ADJ`.

## Core Rule

- Adjectivally used Partizip I classifies as `ADJ`, including attributive,
  predicative, and adverbial uses.
- Attributive or adverbial Partizip II classifies as `ADJ` when it functions as
  an adjective.
- Partizip II in a productive perfect, `werden`-passive, `sein`-perfect, or
  perfect-passive construction classifies as `VERB`.
- `sein + Partizip II` classifies as a productive state passive and therefore
  `VERB` when a corresponding active or `werden`-passive paraphrase preserves
  the contextual meaning and verbal participants.
- Lexicalized or idiomatized participial property meanings classify as `ADJ`.
- Participles of auxiliary Lemmas classify as `AUX`.
- Substantivized infinitives and participles classify as `NOUN`.

## Partizip I -> `ADJ`

Partizip I never forms an analytic German verb form. When it is used as an
attribute, predicate, or adverbial modifier, route it to the adjective Lemma.

- `Der [lachende] Junge winkte uns zu.`
- `Sie kam [lachend] herein.`
- `Das Geräusch ist [störend].`

The adjective Canonical Forms are `lachend` and `störend`, not `lachen` and
`stören`.

## Adjectivally Used Partizip II -> `ADJ`

Attributive agreement and independent property behavior license an adjective
Lemma whose Canonical Form is the participial adjective.

- `Die [eingezeichneten] Seen sind jetzt besser zu sehen.`
- `Der [geschriebene] Brief lag auf dem Tisch.`
- `Der Mann ist völlig [verrückt].`
- `Sie ist [verheiratet].`
- `Die Aufgabe bleibt [ungelöst].`

Evidence for `ADJ` includes lexicalized or idiomatized meaning, adjective-only
intensification or comparison, `un-` formation, coordination with ordinary
adjectives, and use with copulas such as `bleiben` or `wirken`.

## Productive Partizip II -> `VERB`

Perfect and passive constructions retain the source verb Lemma. Every fixed
realized auxiliary belongs to the same high-level Analysis Target, while the
participle remains its morphological head.

- `Die Bank hat [geöffnet].` -> `öffnen/VERB`
- `Die Bank wird [geöffnet].` -> `öffnen/VERB`
- `Der Zug ist [angekommen].` -> `ankommen/VERB`
- `Die Banken sind [geöffnet].` -> `öffnen/VERB`

The final example is a productive state passive under the TIGER boundary:
`Die Banken werden geöffnet` preserves the opening event and its participants.
Both `sind` and `geöffnet` therefore select the same `[sind, geöffnet]`
`Lexeme/VERB` Analysis Target. A later drill-down may still analyze `sind` as
the `sein/AUX` component.

## Predicative Partizip II Decision Order

For `sein + Partizip II`:

1. Test whether an active or `werden`-passive counterpart preserves the same
   meaning and verbal participants. If yes, classify the productive state
   passive as `VERB` and group `sein` with the participle.
2. Otherwise test for a lexicalized or idiomatized property meaning and
   adjective behavior. If present, classify the participle as `ADJ` and keep
   the copula separate.
3. Make this decision once for the occurrence. Clicking the auxiliary and the
   participle may never produce incompatible analyses of the same complex.

## Auxiliary And Nominal Forms

- `Das wäre schön [gewesen].` -> `AUX`
- `Das [Rennen] hat Spaß gemacht.` -> `NOUN`
- `[Schwimmen] ist gesund.` -> `NOUN`
- `Der [Reisende] wartete draußen.` -> `NOUN`
- `Die [Angestellten] streikten gestern.` -> `NOUN`

## Practical Summary

- adjectivally used P1 -> `ADJ`
- adjectivally used or lexicalized P2 -> `ADJ`
- productive perfect/passive/state-passive P2 -> `VERB`
- auxiliary participle -> `AUX`
- substantivized verb form -> `NOUN`

`P1` and `P2` describe participial form; they are not standalone Dumling Kinds.
