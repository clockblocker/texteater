# German `Lexeme/DET` fixed-inventory evidence

Status: research resolution for [Establish the source-backed German DET fixed
inventory][issue-224] under [Wayfinder: Open and Closed linguistic production
routes][map-223]. This note records source facts and gaps. It does not implement
the Closed Route or declare its inventory complete.

## Verdict

The current `de/Lexeme/DET` route **cannot yet be enabled as a Closed Lemma or
Closed Reading route**. Grammis provides a strong source-backed nucleus for the
native German article inventory, but it does not establish an exhaustive
inventory matching Dumling's broader UD-shaped `DET` route. Three independent
gaps prevent the route's completeness guarantee:

1. The current route expressly admits foreign and code-switched determiners.
   The Dumgen contract gives English `the` as a valid German-route DET with
   `foreign: "Yes"`, while German GSD has observed foreign DET tokens from
   several languages. No finite native-German catalog can cover that open-ended
   set ([current DET prompt][det-prompt], [current DET corpus][det-corpus],
   [German GSD inventory][gsd-inventory]).
2. The native DET/ADJ and DET/PRON perimeter is not a settled exhaustive list.
   Grammis's two Quantifikativ-Artikel inventories differ, one ends in an
   ellipsis, and Grammis explicitly calls the boundary uneven. German UD still
   marks cases such as `anderer` as “to be decided” ([Grammis systematic
   inventory][grammis-quant-systematic], [Grammis terminology
   inventory][grammis-quant-terminology], [German UD DET][ud-de-det]).
3. Sources do not choose Dumling Emoji Descriptions or the exact authored
   Dumrel Knowledge strings. Grammis can support an original German synthesis
   of grammatical function, but it does not supply the product's emoji labels,
   citation-form transcription policy, English translation buckets, or exact
   Lemma-targeted Semantic Relations.

The route should therefore remain Open until the acceptance gate resolves the
route perimeter and the authored Reading/Knowledge choices below. Treating a
treebank snapshot as the fixed catalog would turn “Closed” into “observed in one
corpus,” which is a different and weaker guarantee.

## What Grammis does establish

Grammis defines Artikel by their shared determination function and divides
them into definite, indefinite, possessive, demonstrative, W-, and
quantificational subclasses. It also distinguishes attributive Artikel from
parallel pronominal uses ([Grammis Artikel][grammis-artikel]). That distinction
is compatible with Target Classification selecting `DET` before the Closed
branch.

The following is the source-backed **native nucleus**, not a final seed list.
All rows share the Dumling route fields `language: "de"`, `family: "Lexeme"`,
and `kind: "DET"`. The `coreFeatures` column is the product projection into the
existing Dumling codec; Grammis owns the grammatical facts, while UD and the
repository own these particular enum names.

| Source subclass | Source-backed Canonical Form candidates | Dumling `coreFeatures` projection | Completeness limit |
| --- | --- | --- | --- |
| Definite article | `der` (the source lists paradigm forms `der/die/das/...`) | `definite: "Def"`, `pronType: "Art"`; other core fields null | One well-supported Lemma. Grammis treats its anaphoric, generic, unique-reference, name, and measure uses as uses of the definite article rather than separate lexical inventory entries ([definite article][grammis-definite]). |
| Indefinite article | `ein` | `definite: "Ind"`, `numType: "Card"`, `pronType: "Art"`; other core fields null | One well-supported singular-only Lemma ([indefinite article][grammis-indefinite]). `NumType: "Card"` is the German UD/product projection, not a Grammis field ([German UD DET][ud-de-det]). |
| Possessive articles | `mein`, `dein`, `Ihr`, `sein`, `ihr`, `unser`, `euer` | all: `poss: "Yes"`, `pronType: "Prs"`; person 1 for `mein/unser`, 2 for `dein/euer/Ihr`, 3 for `sein/ihr`; `polite: "Form"` for formal `Ihr` | Grammis supplies the closed headword set and the speaker/addressee/anaphoric distinctions. Possessor gender and number vary independently from agreement with the possessed noun and remain contextual Surface features in Dumling ([possessive articles][grammis-possessive]). |
| Demonstrative articles | `derjenige`, `derselbe`, `dieser`, `jener`, `solcher` | normally `pronType: "Dem"` | Grammis calls this the German inventory ([demonstrative articles][grammis-demonstrative]). The current Dumgen policy instead maps attested `selben` to Lemma `selber` with `pronType: "Emp"`; that conflict must be decided before either value is seeded ([current DET prompt][det-prompt]). |
| W-articles | the `welch-` paradigm, `wieviel`, and the multiword `was für ein` pattern | interrogative `welcher`/`wieviel`: `pronType: "Int"`; exclamative invariant `welch`: `pronType: "Exc"`; current relative `welcher`: `pronType: "Rel"` | Grammis groups interrogative, exclamative, and embedded-W functions and lists a multiword pattern ([W-articles][grammis-w]). Dumling accepts only one scalar `pronType`, while German GSD combines `Int,Rel`; the exact Lemma split and whether `was für ein` is one Analysis Target are product decisions, not source facts ([GSD PronType statistics][gsd-prontype]). |
| Quantificational articles, narrow systematic list | `alle`, `einige`, `etliche`, `irgendein`, `irgendwelcher`, `jeder`, `jedweder`, `kein`, `mancher`, `mehrere` | `kein`: `pronType: "Neg"`; `alle/jeder`: `pronType: "Tot"`; remaining candidates: `pronType: "Ind"` | The Canonical Forms normalize Grammis's stem notation to the repository's citation convention. This list is evidence-backed but not exhaustive for the product route ([Grammis systematic inventory][grammis-quant-systematic]). |
| Additional Grammis quantificational members | `lauter`, invariant `manch`, `sämtlich` | likely `pronType: "Ind"` or `"Tot"`, subject to product policy | Grammis's terminology inventory adds these and ends with an ellipsis; the same source distinguishes invariant `manch` from inflected `manch-` ([Grammis terminology inventory][grammis-quant-terminology]). The ellipsis is direct evidence that the page is not a closure proof. |

Grammis also names `beide` as a boundary case between articles and adjectives.
German UD chooses `DET`, `PronType=Tot`, and `NumType=Card` for it. German UD
also chooses DET for `viel`, `mehr`, `wenig`, and `weniger`, while documenting
their mixed behavior and leaving `anderer` unresolved ([Grammis
Quantifikativ-Artikel][grammis-quant-systematic], [German UD DET][ud-de-det]).
Those are defensible inputs to a product decision; they do not expand the
Grammis nucleus automatically.

## Why German GSD is evidence, not the catalog

The pinned German GSD 2.18 annotation contains 48 case-sensitive DET lemmas. Its
DET data covers `Art`, `Dem`, `Emp`, `Ind`, `Int|Rel`, `Neg`, `Prs`, and `Tot`,
while Dumling additionally makes `Int` and `Rel` scalar alternatives and adds
the product-specific `Exc`. It includes native and foreign items and
illustrates exactly why the route is broader than traditional German articles.
Examples include:

- established native candidates such as `der`, `ein`, `dieser`, `jener`,
  `mein`, `kein`, `alle`, `beide`, `viel`, `mehr`, `wenig`, and `wieviel`;
- disputed or peripheral candidates such as `anderer`, `allermeister`,
  `dergleiche`, `ebendieser`, `keinerlei`, `mancherlei`, `selbig`, `soviel`,
  `sämtlich`, and `zuviel`; and
- foreign candidates such as `the`, `a`, `ha`, `alla`, `dessa`, `no`, and
  `quelque` ([German GSD inventory][gsd-inventory], [GSD PronType
  statistics][gsd-prontype]).

The treebank itself warns that its lemmas and morphological features are
assigned automatically and not manually checked; only its source-style POS was
manually annotated and then converted. Therefore the observed 48 are useful
coverage and adversarial cases, but they are not an authoritative fixed
inventory ([German GSD metadata][gsd-metadata]).

The repository's current DET corpus is broader again: it deliberately tests
`derlei`, archaic `etwelcher`, ordinal `wievielte`, the quantifiers `mehr`,
`wenig`, `meist`, and `viel`, colloquial Surface variants `ne` and `n` of
`ein`, and foreign `the` ([current DET corpus][det-corpus]). `ne` and `n` are
ordinary Surface variants, not extra Lemmas, but the other cases need explicit
catalog decisions.

## DTO mapping and the missing Reading inventory

No special Closed DTO is needed. Every fixed grammatical member has the
ordinary Dumling Lemma shape:

```ts
{
  language: "de",
  canonicalForm,
  family: "Lexeme",
  kind: "DET",
  coreFeatures: {
    definite,
    extPos,
    foreign,
    numType,
    person,
    polite,
    poss,
    pronType,
  },
}
```

The current codec makes all eight Core Feature fields mandatory and nullable
([Dumling determiner features][dumling-det-features]). Inflectional agreement,
degree, and possessor gender/number belong to Surface, not the contextless fixed
Lemma. Ordinary Reading identity remains exactly `{ lemma,
emojiDescription }` ([Dumling Reading][dumling-reading]).

The sources support these semantic grouping constraints:

- `der` is one definite-article Lemma even though it has several discourse
  uses; Grammis presents those as uses of the same article.
- Demonstrative articles share a deictic determination function, but Grammis
  says their exact reference behavior differs. That supports one Reading per
  exact Lemma as a conservative starting point, not one shared Reading across
  Lemmas ([demonstrative articles][grammis-demonstrative], [minimal noun
  phrases][grammis-minimal-np]).
- Possessive articles express belonging relative to speaker, addressee, or an
  anaphoric referent. The fixed Lemmas encode those grammatical distinctions;
  contextual owner gender/number does not by itself justify new Readings
  ([possessive articles][grammis-possessive]).
- W-article interrogative, exclamative, and relative behavior cannot be merged
  before the scalar `pronType` Lemma split is decided.

What the sources **do not** determine is each required Emoji Description. The
existing Reading corpus proposes `👉` for both definite `der` and demonstrative
`dieser`, but that is current product evidence, not an IDS or UD fact
([Reading function-word cases][reading-cases]). Until every exact Lemma has an
approved semantic grouping and one-to-four-emoji label, there is no complete
Reading catalog.

## Missing Reading Knowledge

For `de/Lexeme/DET`, Dumrel's current applicable mask requests Transcription, a
German Definition, an English Translation bucket, and Synonym, Near Synonym,
Antonym, and Near Antonym buckets ([German Knowledge applicability][dumrel-det]).
The ordinary fixed value is still just `ReadingKnowledge` with optional fields;
it does not carry a Reading owner or Closed marker ([Dumrel Knowledge
type][dumrel-knowledge]).

Grammis can support an originally worded German definition of each article's
grammatical function. It cannot by itself complete the remaining values:

| Knowledge leaf | What is sourceable now | Remaining authored decision |
| --- | --- | --- |
| `definition` | Class functions and several headword distinctions from the cited Grammis pages | Write original concise definitions per exact Reading; do not copy Grammis prose. |
| `transcription` | Nothing in the cited grammar inventory | Choose and cite a pronunciation authority and freeze a transcription convention for citation forms. |
| `translations.en` | Broad glosses can be translated manually from the grammatical analysis | Approve literal English values per Reading, especially `sein` (`his/its`), `ihr` (`her/their`), formal `Ihr`, and quantifiers. |
| `semanticRelations` | The cited pages establish subclass membership, not Dumrel's exact Reading-to-Lemma relation claims | Decide whether an intentionally empty relation set counts as complete; otherwise source every direct target Lemma. Never infer synonymy from shared subclass alone. |

Because Knowledge maps one-to-one to an exact Reading, this work cannot finish
before the Reading catalog does. No fingerprint, special ID, or alternate
persistence path follows from this gap.

## Licensing and provenance boundary

Grammis encourages appropriate citation and links, but its imprint says all
site contents are protected and any exploitation requires prior written IDS
consent ([Grammis imprint][grammis-imprint]). This artifact therefore contains
an original factual synthesis and links, not copied prose, paradigms, or a bulk
scrape. For product catalogs:

- author original DTO strings from independently understood grammatical facts
  and preserve per-row source citations;
- do not copy Grammis definitions, examples, or tables into seed data without
  written IDS permission; and
- seek IDS permission before any substantial extraction or adapted inventory
  if the intended use may exceed ordinary citation. This is a conservative
  repository policy, not legal advice.

German GSD 2.18 marks its annotations CC BY-SA 4.0, while warning separately
about rights in underlying sentences. Any exact treebank-derived catalog needs
an explicit attribution/share-alike compatibility decision; raw corpus
sentences should not enter product fixtures merely because the annotations are
licensed ([GSD license][gsd-license], [GSD metadata][gsd-metadata]). The safer
role for GSD here is coverage evidence and adversarial discovery, not verbatim
seed data.

## Decision for the Wayfinder

Keep both `isClosedRouteFor.lemma({ language: "de", family: "Lexeme", kind:
"DET" })` and `.reading(...)` false for now. A future `true` requires all of the
following:

1. Freeze how foreign/code-switched determiners leave or are handled inside the
   route without falling through to the Open route.
2. Freeze the native lexical perimeter, including `derselbe` versus the current
   `selber/Emp` policy, `welcher` Int/Rel/Exc splitting, the multiword `was für
   ein` pattern, quantifier/adjective boundaries, and the repository-only
   archaic/peripheral candidates.
3. Author one ordinary Lemma DTO per accepted Core Feature tuple, then approve
   every ordinary Reading's semantic grouping and Emoji Description.
4. Author the corresponding ordinary Reading Knowledge with a provenance
   record and a defined meaning of “complete” for absent relation buckets.
5. Apply the source licensing policy above before shipping the fixed-member
   loader.

The Grammis nucleus in this note is sufficient to drive those decisions. It is
not sufficient to assert operational completeness today.

[issue-224]: https://github.com/clockblocker/texteater/issues/224
[map-223]: https://github.com/clockblocker/texteater/issues/223
[grammis-artikel]: https://grammis.ids-mannheim.de/systematische-grammatik/275
[grammis-definite]: https://grammis.ids-mannheim.de/terminologie/311
[grammis-indefinite]: https://grammis.ids-mannheim.de/terminologie/327
[grammis-possessive]: https://grammis.ids-mannheim.de/systematische-grammatik/373
[grammis-demonstrative]: https://grammis.ids-mannheim.de/systematische-grammatik/375
[grammis-w]: https://grammis.ids-mannheim.de/systematische-grammatik/376
[grammis-quant-systematic]: https://grammis.ids-mannheim.de/systematische-grammatik/377
[grammis-quant-terminology]: https://grammis.ids-mannheim.de/terminologie/215
[grammis-minimal-np]: https://grammis.ids-mannheim.de/systematische-grammatik/1473
[grammis-imprint]: https://grammis.ids-mannheim.de/impressum
[ud-de-det]: https://universaldependencies.org/de/pos/DET.html
[gsd-inventory]: https://universaldependencies.org/treebanks/de_gsd/index.html
[gsd-prontype]: https://universaldependencies.org/treebanks/de_gsd/de_gsd-feat-PronType.html
[gsd-metadata]: https://github.com/UniversalDependencies/UD_German-GSD/blob/r2.18/README.md
[gsd-license]: https://github.com/UniversalDependencies/UD_German-GSD/blob/r2.18/LICENSE.txt
[det-prompt]: ../../../dumgen/src/promptsmith/production/grammatical-resolution/de/lexeme/determiner/prompt-source.ts
[det-corpus]: ../../../dumgen/src/promptsmith/production/grammatical-resolution/de/lexeme/determiner/golden-corpus/cases/core-features.ts
[reading-cases]: ../../../dumgen/src/promptsmith/production/reading-resolution/de/golden-corpus/cases/function-words.ts
[dumling-det-features]: ../../src/types/concrete-language/features/de/lexeme/determiner.ts
[dumling-reading]: ../../src/types/public-types.ts
[dumrel-det]: ../../../dumrel/src/applicability/de.ts
[dumrel-knowledge]: ../../../dumrel/src/types.ts
