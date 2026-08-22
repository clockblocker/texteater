# German Closed Route candidates beyond `Lexeme/DET`

Status: research resolution for issue 230. Researched 2026-08-22.

## Decision

No additional German Route Closure leaf is ready to become `true` today. A
Closed leaf is an operational completeness guarantee, while none of the routes
below yet has a complete hand-authored Lemma, Reading, and applicable Knowledge
inventory loaded through the ordinary data path.

Four later closure tracks are defensible at the current
`language/Family/Kind` granularity:

| Route | Lemma trajectory | Reading trajectory | Why it is a candidate rather than enabled |
| --- | --- | --- | --- |
| `de/Lexeme/AUX` | Closed candidate | Closed candidate | Dumgen already narrows the route to nine identities, but that perimeter must be reconciled with Grammis's auxiliary and modal peripheries; every fixed Reading and its Knowledge still need authoring. |
| `de/Lexeme/PRON` | Conditional Closed candidate | Conditional Closed candidate | UD explicitly calls `PRON` a closed class, but Dumgen currently admits arbitrary foreign/code-switched pronoun identities and productive lexicalized compounds. The German-native perimeter must be made compatible with the route contract first. |
| `de/Lexeme/CCONJ` | Conditional Closed candidate | Remain Open initially | Grammis publishes a bounded Konjunktor list, but its taxonomy intentionally excludes several forms that Dumgen currently accepts as `CCONJ`. A project-owned exact Lemma perimeter is possible only after that mismatch is resolved; contextual relation Readings are not yet exhaustively bounded. |
| `de/Construction/Fusion` | Conditional Closed candidate | Remain Open initially | Dumgen already limits the route to conventional written preposition–article fusions and excludes dialectal lookalikes. Grammis records the fusions per preposition. Their inherited adpositional relations remain contextual, so fixed Lemmas do not imply fixed Readings. |

The required invariant is preserved: none of the two Reading candidates can be
enabled before its Lemma leaf, and the two Lemma-only candidates keep Reading
Open.

`de/Lexeme/ADP` is not a Lemma-closure candidate. It is still the clearest
example of why contextual Reading production may require semantic
classification (`mit` as companion, instrument, or grammatical connector),
but it cannot serve as the motivating example of a Closed Lemma/Open Reading
route.

## What “candidate” means

The matrix separates three claims that must not be collapsed:

1. A grammar may describe a class, or one of its subclasses, as closed.
2. Dumling may be able to define a complete product perimeter for one exact
   route.
3. A Route Closure leaf may become `true` only after ordinary fixed values,
   internal production, setup loading, and acceptance evidence are complete.

This note supports the second claim for the four tracks above. It supports the
third claim for none of them yet. The authored route map must therefore keep
every audited leaf `false` until its own implementation work passes the common
acceptance gate.

## Primary-source findings

### `Lexeme/AUX`: strongest candidate for both leaves

Grammis gives a small, explicit core. Its Hilfsverb entry names `haben`, `sein`,
and `werden` as the main inventory, but also records passive-forming peripheral
items `bekommen`, `erhalten`, `gehören`, and `kriegen`, plus colloquial
auxiliary `tun`. Its Modalverb entry gives the six-item core `müssen`, `sollen`,
`dürfen`, `mögen`, `wollen`, and `können`, then distinguishes modal periphery
and semi-modals. These are source-backed boundaries, not one automatically
aligned Dumling inventory. [Grammis: Hilfsverb](https://grammis.ids-mannheim.de/systematische-grammatik/379),
[Grammis: Modalverb](https://grammis.ids-mannheim.de/systematische-grammatik/380)

Dumgen's current fixed-route policy accepts exactly the six modal identities
plus `sein`, `haben`, and `werden`. That is a coherent nine-Lemma product
perimeter, but closing it requires an explicit decision that Grammis's
peripheral auxiliaries remain `VERB` or otherwise outside this Dumling route.
See the local
[`AUX` Grammatical Resolution Prompt Source](../../../dumgen/src/promptsmith/production/grammatical-resolution/de/lexeme/auxiliary/prompt-source.ts).

Reading closure is plausible but independent. The current Reading corpus
already distinguishes future and passive Readings of `werden`; the fixed
catalog must additionally cover the accepted copular, perfect, passive,
future, and modal functions and their approved Knowledge. That catalog is what
prevents a contextual Surface such as `sind` from leaking the English Surface
translation “are” into Knowledge for Lemma `sein`. See the local
[`AUX` Reading case](../../../dumgen/src/promptsmith/production/reading-resolution/de/golden-corpus/cases/function-words.ts).

### `Lexeme/PRON`: linguistically closed, operationally blocked

Universal Dependencies defines `PRON` as a closed class and asks
language-specific documentation to list all pronouns and their ambiguities.
Its German page separates pronouns from determiners lexically and identifies
the personal, interrogative, relative, indefinite, total, and negative
subclasses. [UD: `PRON`](https://universaldependencies.org/u/pos/PRON.html),
[UD German: `PRON`](https://universaldependencies.org/de/pos/PRON.html)

The current Dumgen contract is broader than that native inventory: it accepts
an established foreign code-switched PRON as a German-route Lemma and preserves
its source-language Canonical Form. It also preserves complete lexicalized
indefinite compounds. An arbitrary foreign identity makes an exhaustive fixed
German Lemma catalog impossible. The route can become Closed only after a
policy decides whether such members resolve under their source language, under
an Open residual route, or inside a separately bounded German inventory. See
the local
[`PRON` Grammatical Resolution Prompt Source](../../../dumgen/src/promptsmith/production/grammatical-resolution/de/lexeme/pronoun/prompt-source.ts).

Once that perimeter exists, both leaves are plausible. Grammatical Resolution
already distinguishes relative `der`, demonstrative `der`, personal forms,
formal `Sie`, and other Core Feature identities. The Reading corpus confirms
that the pronoun's stable role—not its neighboring referent—is the Reading:
relative `das` is `🔗`, not a house, and `jemand` is an unspecified person.

### `Lexeme/CCONJ`: possible fixed Lemmas, but not yet fixed semantics

Grammis publishes a concrete Konjunktor list including single- and multi-member
forms. The same source explicitly says its taxonomy leaves out several items
that most grammars call coordinating conjunctions, including `aber`, `allein`,
`denn`, and `weder … noch`. Dumgen currently accepts those forms and adds fixed
correlatives such as `je … desto`. The source list therefore cannot be copied
as the Dumling inventory; a product classification decision must reconcile the
two perimeters. [Grammis: Konjunktoren](https://grammis.ids-mannheim.de/systematische-grammatik/1281),
[Grammis: notes on the Konjunktor list](https://grammis.ids-mannheim.de/systematische-grammatik/2565),
and the local
[`CCONJ` Grammatical Resolution Prompt Source](../../../dumgen/src/promptsmith/production/grammatical-resolution/de/lexeme/coordinating-conjunction/prompt-source.ts).

The broader connector inventory does not justify Reading closure: Grammis
describes about 200 connectors spanning several word classes and explicitly
says that functional class is not fully closed. The current Reading corpus
also distinguishes contextual semantic relations, such as contrast for
`aber`. The safe rollout is therefore Lemma closure first, with Reading left
Open until a later source-backed semantic-perimeter investigation proves a
complete fixed catalog. [Grammis: Konnektor](https://grammis.ids-mannheim.de/terminologie/135)

### `Construction/Fusion`: finite written forms, inherited open relations

Dumgen defines this route narrowly as one conventional written form realizing
a German preposition plus article and lists forms such as `am`, `beim`, `im`,
`ins`, `vom`, `zum`, and `zur`; its examples deliberately exclude dialectal
lookalikes. Grammis's preposition dictionary records conventional fusions per
preposition, for example `bei + dem → beim` and `in + dem/das → im/ins`.
[Grammis: `bei`](https://grammis.ids-mannheim.de/praepositionen/299624),
[Grammis: `in`](https://grammis.ids-mannheim.de/praepositionen/299644), and the
local
[`Fusion` Grammatical Resolution Prompt Source](../../../dumgen/src/promptsmith/production/grammatical-resolution/de/construction/fusion/prompt-source.ts).

This supports a finite standard-Lemma inventory after every admitted form and
variant is audited. It does not close Reading. The existing Reading corpus
already gives `am` different locative and calendar-time Readings, and those
relations inherit the contextual semantics of the underlying adposition.

## Required exclusions

### Functional-word routes that remain Open

- `de/Lexeme/ADP`: Grammis says German prepositions are neither completely
  closed nor homogeneous, with inventories varying from 27 to 200 and newer
  members arising from nouns, adjectives, participles, and phrases. It also
  says core preposition meaning is strongly context-controlled. Dumgen admits
  foreign ADPs. Both leaves remain Open.
  [Grammis: Präposition](https://grammis.ids-mannheim.de/systematische-grammatik/210)
- `de/Lexeme/PART`: Grammis says only the Abtönungspartikel subclass is closed.
  Dumling's single `PART` route also contains negation, infinitival, focus,
  response, and other particles, while Dumgen admits foreign particles. A
  closed subclass cannot close the whole route.
  [Grammis: Abtönungspartikeln](https://grammis.ids-mannheim.de/systematische-grammatik/769),
  [UD: `PART`](https://universaldependencies.org/u/pos/PART.html)
- `de/Lexeme/SCONJ`: Grammis provides a long list containing simple,
  multi-member, and phrase-framed subordinators, but the encompassing connector
  class is not fully closed and the project's exact perimeter is not sourced.
  The route also has contextually distinct Readings such as temporal and
  adversative `während`. Both leaves remain Open.
  [Grammis: Subjunktoren](https://grammis.ids-mannheim.de/systematische-grammatik/1202)

### All other Lexeme routes

The remaining routes are Open for direct reasons:

- `ADJ`, `ADV`, `NOUN`, `PROPN`, and `VERB` are ordinary expanding lexical
  classes.
- `INTJ` admits new expressive coinages; Grammis lists original coinage as one
  way German vocabulary expands.
- `NUM` has a productive unbounded cardinal inventory.
- `PUNCT` admits arbitrary character groups and even corpus-specific spoken
  event notation; `SYM` includes extensible currency, mathematical, emoticon,
  and emoji inventories.
- `X` is intentionally residual and unanalyzed, so its members cannot be
  pre-enumerated.

See [Grammis: Wortschatzerweiterung](https://grammis.ids-mannheim.de/systematische-grammatik/1330),
[UD: `PUNCT`](https://universaldependencies.org/u/pos/PUNCT.html), and
[UD: `SYM`](https://universaldependencies.org/u/pos/SYM.html).

### Every Morpheme route

Keep `Circumfix`, `Clitic`, `Duplifix`, `Infix`, `Interfix`, `Prefix`, `Root`,
`Suffix`, `Suffixoid`, `ToneMarking`, and `Transfix` Open.

German word formation imports new affixes as well as words, and the current
routes do not separate a finite inflectional subsystem from open derivational
or borrowed material. Even apparently small inventories are analysis-policy
dependent: Grammis's strict Fugenelement analysis leaves only `-i-`, `-o-`, and
`-s-`, but describes the exclusion of inflection-like forms as a formal choice
rather than the uniquely correct analysis; its Interfix discussion records a
competing suffix-extension analysis. Empty or typologically unsupported schema
routes are not Closed inventories: a `true` leaf must be able to resolve every
accepted member, not merely reject all occurrences.

See [Grammis: Wortschatzerweiterung](https://grammis.ids-mannheim.de/systematische-grammatik/1330),
[Grammis: Wortbildungsaffix](https://grammis.ids-mannheim.de/systematische-grammatik/488),
[Grammis: Fugenelement or inflectional affix](https://grammis.ids-mannheim.de/systematische-grammatik/553),
and [Grammis: derivational linking element](https://grammis.ids-mannheim.de/systematische-grammatik/552).

### Every Phraseme route

Keep `Aphorism`, `Collocation`, `DiscourseFormula`, `Idiom`, and `Proverb` Open.
They are lexicons of conventional expressions, not exhaustible grammatical
paradigms. German vocabulary expansion includes newly borrowed phrases, and
newly conventionalized expressions can enter every one of these routes.

## Complete route-tree accounting

The German registry contains 17 Lexeme Kinds, 11 Morpheme Kinds, five Phraseme
Kinds, and one Construction Kind. Excluding the already separate `DET` proving
slice, this audit accounts for all 33 remaining leaves:

- Lemma + Reading candidates: `Lexeme/AUX`, conditionally `Lexeme/PRON`.
- Lemma-only candidates: conditionally `Lexeme/CCONJ` and
  `Construction/Fusion`.
- Open for both: the other 29 leaves listed above.

The registry is an admissibility tree, not evidence that a language route has
an enumerable inventory. See the local
[`LanguagePackFeatureRegistry`](../../src/types/concrete-language/features/feature-registry.ts).

## Provenance and authoring boundary

Grammis welcomes citation and links, but its copyright notice says reuse of
site content requires prior written IDS consent. Fixed DTO catalogs should
therefore contain independently authored project values with per-fact
provenance; this research synthesizes facts and does not copy Grammis tables or
bulk-scrape its dictionaries. [Grammis imprint](https://grammis.ids-mannheim.de/impressum)

No external grammar chooses Dumling Emoji Descriptions or Dumrel's exact
transcriptions, definitions, translations, and relations. Even a linguistically
bounded Lemma class remains operationally Open until those ordinary Reading and
Knowledge values are authored and accepted where Reading closure is proposed.

## Wayfinder consequences

1. Advance `de/Lexeme/AUX` as the next strongest end-to-end Closed candidate
   after the `DET` proof: first freeze the nine-Lemma perimeter against the
   documented periphery, then author the finite Reading/Knowledge catalog.
2. Advance `de/Lexeme/PRON` only behind a route-perimeter decision for foreign
   and code-switched members; if arbitrary foreign PRON stays in this route,
   both leaves must remain Open.
3. Investigate `de/Lexeme/CCONJ` as Lemma-first. Keep Reading Open until a
   separate semantic inventory proves completeness.
4. Mine the standard `de/Construction/Fusion` inventory from cited Grammis
   entries as independently authored facts. Keep Reading Open.
5. Correct the current Route Closure glossary before implementation: ADP is an
   Open/Open counterexample, not a Closed-Lemma/Open-Reading exemplar.

