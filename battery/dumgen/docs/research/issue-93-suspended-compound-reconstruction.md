# German NOUN suspended-compound reconstruction

> **Lifecycle: implemented decision evidence.** System ADR 0004 governs the
> current narrow Ergänzungsstrich reconstruction rule.

Status: decision and focused test inventory for
[texteater#93](https://github.com/clockblocker/texteater/issues/93), which
unblocks the NOUN leaf of [texteater#90](https://github.com/clockblocker/texteater/issues/90).

## Decision

Use a **narrowly licensed Lexeme/NOUN route-level projection rule** for the
initial binary pattern represented by `Kinder- und Jugendbücher`.

Do not relax the shared normalized-Surface projection for other routes, and do
not ask deterministic application code to discover German compound morphology.
The NOUN route may complete one trailing suspended member only when all of
these facts hold:

1. Target Classification supplied exactly one NOUN member and its exact
   attested text ends in one supported Divis representation: U+002D
   HYPHEN-MINUS, U+2010 HYPHEN, or U+2011 NON-BREAKING HYPHEN.
2. The marked sentence contains binary coordination with `und` or `oder`, and
   the other conjunct is one visible, full, closed noun compound to the right.
3. Removing the trailing Divis leaves a non-empty left constituent. The
   proposed completion appends a non-empty, literal terminal substring of the
   visible right conjunct, and removing that substring from the right conjunct
   also leaves a non-empty constituent. The route's grammatical analysis must
   identify that terminal substring as the shared right constituent. For a
   `Standard` member, the completed prefix must equal the attested prefix under
   the shared Unicode/casing fold; only a `Typo` member may repair that prefix.
4. The completed form is the contextual inflection of the same noun Lexeme
   named by the Lemma. Case and number come from the coordination's syntax and
   shared inflection, not from the bare suspended text in isolation.

For the motivating click, the exact result is therefore:

| Field | Value |
| --- | --- |
| target member | `Kinder-` |
| member orthography | `Standard` |
| normalized member / Surface | `Kinderbücher` |
| Surface spelling | `Canonical` |
| Surface kind | `Inflection` |
| case / number | `Acc` / `Plur` |
| realization coverage | `Full` |
| Lemma canonical form | `Kinderbuch` |
| Lemma Core Features | `{ gender: "Neut", hyph: null }` |

The official rules call this character use an *Ergänzungsstrich*: the Divis
interrupts a word to connect more distant word parts. The rule gives
both trailing and leading examples, including `Apfel- oder Kirschkuchen` and
`Schulbücher und -hefte`
([Amtliches Regelwerk 2024, §81(3), pp. 150–151](https://www.rechtschreibrat.com/DOX/RfdR_Amtliches-Regelwerk_2024.pdf)).
This is positive orthographic evidence for contextual completion, not a typo
repair and not free insertion. IDS independently defines a compound as a word
formed from at least two words or stems
([IDS, “Komposition”](https://grammis.ids-mannheim.de/terminologie/128)).

The model owns the linguistic choice of the shared constituent because the
written right compound does not encode its morphological boundary. Application
projection owns the conservative checks above: admitted trailing character,
singleton cardinality, binary coordination, literal terminal-substring reuse,
non-empty constituents, and NOUN-route scoping. This separation prevents a
model from inserting text that is absent from the sentence while avoiding a
second application-owned compound parser. The existing `Typo` path remains the
only exception for repairing characters absent from the source.

## Repository evidence

- The German segmenter's word rule already keeps U+002D, U+2010, and U+2011
  inside a word-like span and admits one of them at its end
  ([source](../../src/source-segmentation/de.ts)). Thus the projected member is
  `Kinder-`, not `Kinder` plus punctuation.
- The previous NOUN Golden Case marks only `Kinder`, emits normalized `Kinder`,
  and calls the occurrence `Partial`
  ([legacy case](../../src/promptsmith/production/grammatical-resolution/de/lexeme/noun/golden-corpus/cases/orthography-and-surface.ts)).
  That case predates the production Segment/member projection and was replaced
  by the NOUN-01 policy under #96.
- The shared validator currently rejects `Standard` changes beyond equality,
  NFC/case folding, while permitting route-authored `Typo` repair
  ([projection](../../src/schema/normalized-surface-projection.ts)). It would
  reject `Kinder-` → `Kinderbücher`, which is why the exception must be
  explicit and route-scoped.
- Dumgen projects exact target members from the Segmented Sentence, while the
  shared Grammatical Resolution seam passes the marked context, route-local
  model projection, and those members to the NOUN-only normalized-Surface
  projector before Attestation construction
  ([input projection](../../src/schema/normalized-surface-projection.ts),
  [shared seam](../../src/catalog/laboratory/de-grammatical-resolution-seam.ts),
  [Attestation construction](../../src/dumgen/implementation.ts)). The shared
  strict validator remains unchanged for every unrelated route.

## Contract effects

- The Attestation/member invariant is unchanged: the one target index aligns
  with one exact Attestation member (`Kinder-`), one orthography value, and one
  normalized member. Reconstruction changes the normalized string at that
  position; it never creates a synthetic Attestation member or borrows the
  `Jugendbücher` Segment into the first Lexeme's membership.
- The first conjunct is `Full`, not `Partial`. In this licensed pattern the
  Ergänzungsstrich realizes the omitted right constituent by orthographic
  reference to the coordinated full form. `Partial` would incorrectly make an
  official full-word spelling into an incomplete occurrence.
- The exact suspended spelling is `Standard`. A misspelled constituent such as
  `Kidner- und Jugendbücher` is `Typo` if the route can defensibly repair it to
  `Kinderbücher`; the Ergänzungsstrich itself does not make it a typo.
- Clicking `Jugendbücher` produces an independent singleton NOUN target and
  uses ordinary strict projection: normalized `Jugendbücher`, Lemma
  `Jugendbuch`, `Acc`/`Plur`, `Full`.
- U+2012 FIGURE DASH, U+2013 EN DASH, U+2014 EM DASH, and U+2212 MINUS SIGN do
  not enter this rule. The official rules distinguish the shorter,
  letter-contacting Divis from the longer Gedankenstrich
  ([Amtliches Regelwerk 2024, §77 note and §81](https://www.rechtschreibrat.com/DOX/RfdR_Amtliches-Regelwerk_2024.pdf));
  Unicode assigns distinct characters and names
  ([Unicode names list, U+2000–U+206F](https://www.unicode.org/charts/nameslist/n_2000.html),
  [U+2200–U+22FF](https://www.unicode.org/charts/nameslist/n_2200.html)).
  Dumgen's existing deterministic segmenter admits only U+002D, U+2010, and
  U+2011 inside or after a word.

This is deliberately not a general Ergänzungsstrich grammar. Leading
suspension (`Schulbücher und -hefte`), multiple coordination (`Kinder-,
Jugend- und Sachbücher`), nested two-sided suspension (`Textilgroß- und
-einzelhandel`), verbs (`be- und entladen`), and non-NOUN routes need separate
policy before becoming accepted inputs.

## Implemented ADR and context updates

No accepted ADR is superseded.

- Paragraph three of
  [system ADR 0004](../../../../docs/adr/0004-align-german-high-level-targets-with-fixed-realized-attestation-members.md),
  now records the NOUN exception for one positionally aligned Standard suspended
  member under the route guards above. Its “exactly the target members” rule
  remains true by cardinality and position with that explicit contextual
  completion qualification.
- The `Full` definition in
  [system ADR 0003](../../../../docs/adr/0003-attestation-supersedes-selection-and-owns-realization-coverage.md)
  now treats an official Ergänzungsstrich spelling as a licensed complete
  realization, analogous in coverage (but not Surface spelling status) to that
  ADR's conventional-short-form example.
- Corpus coverage under
  [Dumgen ADR 0001](../adr/0001-batch-intake-and-local-source-segmentation.md)
  and the production Source Segmentation tests pins U+002D/U+2010/U+2011 as part
  of a trailing `ResolvableText` word candidate and the four dash/minus
  lookalikes as separate non-word Segments. Its deterministic, lossless,
  zero-package segmentation decision did not change.

The same qualifications are recorded in
[Dumgen Context](../../CONTEXT.md) and
[Dumling Context](../../../dumling/CONTEXT.md). One-to-one member alignment,
source order, exact Attestation text, and all unrelated routes remain strict.

## Focused deterministic test inventory

### Source Segmentation (implemented in #93)

| ID | Input tail | Exact segment result |
| --- | --- | --- |
| SEG-01 | `Kinder-` (U+002D) | one `ResolvableText("Kinder-")` |
| SEG-02 | `Kinder‐` (U+2010) | one `ResolvableText("Kinder‐")` |
| SEG-03 | `Kinder‑` (U+2011) | one `ResolvableText("Kinder‑")` |
| SEG-04 | `Kinder‒` (U+2012) | `ResolvableText("Kinder")`, `Punctuation("‒")` |
| SEG-05 | `Kinder–` (U+2013) | `ResolvableText("Kinder")`, `Punctuation("–")` |
| SEG-06 | `Kinder—` (U+2014) | `ResolvableText("Kinder")`, `Punctuation("—")` |
| SEG-07 | `Kinder−` (U+2212) | `ResolvableText("Kinder")`, `OpaqueText("−")` |

The existing production corpus already covers U+2011 internally in
`E‑Mail‑Adresse` and U+002D after `Arbeits-`. The focused matrix locks every
accepted trailing representation and the confusable boundary.

### Target Classification (implemented in the production classification corpus)

| ID | Click | Expected route and membership |
| --- | --- | --- |
| TC-01 | `Kinder-` in `Kinder- und Jugendbücher` | `Lexeme/NOUN`, singleton exact `Kinder-` |
| TC-02 | `Jugendbücher` in the same sentence | `Lexeme/NOUN`, singleton exact `Jugendbücher` |
| TC-03 | `Kinder-` in `Kinder- oder Jugendbücher` | `Lexeme/NOUN`, singleton exact `Kinder-` |
| TC-04 | context-free final `Kinder-` | no Analysis Target / chain `Unresolved` |
| TC-05 | `Kinder` before U+2013 in `Kinder– und Jugendbücher` | no suspended-compound license |
| TC-06 | malformed `Kinder-- und Jugendbücher` | no suspended-compound license |

### NOUN route and projection (implemented by #96)

Accepted cases:

| ID | Marked context | Expected normalized Surface; Lemma; features |
| --- | --- | --- |
| NOUN-01 | `Sie verkauft <TARGET>Kinder-</TARGET> und Jugendbücher.` | `Kinderbücher`; `Kinderbuch`; `Acc Plur`; Standard, Canonical, Full |
| NOUN-02 | `Sie verkauft Kinder- und <TARGET>Jugendbücher</TARGET>.` | `Jugendbücher`; `Jugendbuch`; `Acc Plur`; ordinary strict projection |
| NOUN-03 | `Sie verkauft <TARGET>Kinder‐</TARGET> und Jugendbücher.` | same as NOUN-01, preserving U+2010 only in the Attestation member |
| NOUN-04 | `Sie verkauft <TARGET>Kinder‑</TARGET> und Jugendbücher.` | same as NOUN-01, preserving U+2011 only in the Attestation member |
| NOUN-05 | `Sie kauft ein <TARGET>Kinder-</TARGET> oder Jugendbuch.` | `Kinderbuch`; `Kinderbuch`; `Acc Sing`; Standard, Canonical, Full |
| NOUN-06 | `Die Seiten des <TARGET>Kinder-</TARGET> und Jugendbuchs fehlen.` | `Kinderbuchs`; `Kinderbuch`; `Gen Sing`; Standard, Canonical, Full |
| NOUN-07 | `Mit <TARGET>Kinder-</TARGET> und Jugendbüchern kennt sie sich aus.` | `Kinderbüchern`; `Kinderbuch`; `Dat Plur`; Standard, Canonical, Full |
| NOUN-08 | `<TARGET>Kinder-</TARGET> und Jugendbücher sind beliebt.` | `Kinderbücher`; `Kinderbuch`; `Nom Plur`; Standard, Canonical, Full |
| NOUN-09 | `Sie verkauft <TARGET>Kidner-</TARGET> und Jugendbücher.` | `Kinderbücher`; `Kinderbuch`; `Acc Plur`; Typo, Canonical, Full |

Rejection/contract cases:

| ID | Marked context | Required result |
| --- | --- | --- |
| NEG-01 | `Fragment: <TARGET>Kinder-</TARGET>` | no completion: classification rejection, or contract error if an invalid NOUN target is injected |
| NEG-02 | `<TARGET>Kinder-</TARGET> Überraschung` | no coordination; no completion |
| NEG-03 | `<TARGET>Kinder-</TARGET> und gestern kamen alle.` | no full right noun compound; no completion |
| NEG-04 | `<TARGET>Kinder</TARGET>– und Jugendbücher` | U+2013 is outside the member and outside the license |
| NEG-05 | `<TARGET>Kinder-</TARGET> und Bücher` | completion would leave no right first constituent; reject |
| NEG-06 | `<TARGET>Mutter-</TARGET> und Kind` | do not invent `Mutterkind`; right first constituent would be empty |
| NEG-07 | `<TARGET>Kinder-</TARGET> und Jugendliche` | no shared right compound constituent; reject |
| NEG-08 | `<TARGET>Kinder-</TARGET> und Jugend Bücher` | suffix is not inside one full right compound; reject |
| NEG-09 | `<TARGET>Kinder-</TARGET> und Jugendbücher` → `Kinderhefte` | suffix is absent from the visible right conjunct; projection error |
| NEG-10 | `<TARGET>Kinder-</TARGET> und Jugendbücher` → two normalized/Attestation members | one-to-one cardinality error |
| NEG-11 | `<TARGET>Kinder-</TARGET> und Jugendbücher` → `Kinder` / Partial | rejects the old legacy interpretation; official suspension is Standard and Full |
| NEG-12 | `<TARGET>Kinder-</TARGET> und Jugendbücher` → `Kinderbuch` | rejects lemmatizing the plural contextual Surface |

The route implementation exercises the accepted cases through its pure
evaluator and the projection cases directly. Its retained live protocol kept
demonstrations, development cases, and untouched acceptance disjoint.
