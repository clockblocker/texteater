# Difficult German Semantic Relation Examples

These cases apply Dumrel's
[German Semantic Relation Judgment Contract](../../dumrel/docs/german-semantic-relation-judgment-contract.md).
They are auditable teaching cases for corpus authoring and review, not prompt
demonstrations or current model outputs.

`Lexeme/NOUN` and similar labels describe the target Unit Shadow. A gloss in
parentheses identifies the intended target Reading for human evidence; it is
not part of the emitted Unit Shadow.

## Anchor case: `Pfote 🐾`

Context: `Der Hund hob die Pfote.` Source: `Pfote 🐾`, `Lexeme/NOUN`.

| Requested kind | Judgment | Decisive evidence |
| --- | --- | --- |
| Synonym | `null` | No ordinary German word preserves the exact meaning, distribution, and connotation. |
| Near Synonym | accept `Tatze`, `Lexeme/NOUN` | Both denote an animal paw; `Tatze` favors larger animals and carries a coarser or affectionate coloring. |
| Antonym | `null` | A paw has no conventional direct lexical opposite. |
| Near Antonym | `null` | No established German contrast pairs with `Pfote`. |
| Hypernym | accept `Körperteil`, `Lexeme/NOUN` | Every paw is a body part; `Tier` is its bearer whole, not its kind. |
| Holonym | accept `Tier`, `Lexeme/NOUN` | A paw is conventionally a body part of an animal; this is the useful bearer whole. |

`Hund` is rejected under all six requested kinds. The encounter's dog owns the
paw, but `Hund` is neither generally the only bearer whole nor a synonym,
opposite, or category of `Pfote`.

## Synonym and Near Synonym

| ID | Source Reading and context | Kind and judgment | Why |
| --- | --- | --- | --- |
| S1 | `Hubschrauber 🚁`, `Der Hubschrauber landete.` | Synonym: accept `Helikopter`, `Lexeme/NOUN` | The intended Readings denote the same aircraft with no systematic ordinary difference in truth conditions, register, region, or connotation. Loanword versus native formation alone is irrelevant. |
| S2 | `Samstag 📅`, `Am Samstag arbeiten wir nicht.` | Synonym: reject `Sonnabend`; Near Synonym: accept `Sonnabend`, `Lexeme/NOUN` | The day is the same, but `Sonnabend` has a stable regional distribution. That restriction blocks exact Synonymy. |
| S3 | `ins Gras beißen ☠️`, `Der Tyrann biss endlich ins Gras.`, `Phraseme/Idiom` | Synonym: reject `sterben`; Near Synonym: accept `sterben`, `Lexeme/VERB` | The Lexeme preserves the central event but lacks the Idiom's colloquial, humorous connotation. This is a Phraseme-to-Lexeme target. |
| S4 | `ab und zu 🕰️`, `Ab und zu regnet es.`, `Phraseme/Idiom` | Synonym: accept `hin und wieder`, `Phraseme/Idiom` | Both conventionally mean “occasionally” in the same register and distribution. This is a Phraseme-to-Phraseme target. |
| S5 | `klug 🧠`, `Das war eine kluge Entscheidung.` | Synonym: reject `intelligent`; Near Synonym: accept `intelligent`, `Lexeme/ADJ` | The overlap is broad, but `klug` also evaluates practical judgment while `intelligent` favors cognitive capacity. |
| S6 | `stark 💪` in `Das ist starker Regen.` | Near Synonym: reject `heftig`, `Lexeme/ADJ` for the Reading “physically strong” | The sentence can trigger an intensity Reading, but encounter collocation cannot attach `heftig` to a different exact source Reading. Under the intensity Reading, `heftig` can be judged separately. |
| S7 | `Föhre 🌲`, `Die Föhre ist immergrün.` | Near Synonym: accept `Kiefer`, `Lexeme/NOUN` (pine Reading) | The pine Readings overlap closely, subject to regional and taxonomic usage. The unrelated jaw Reading of target Lemma `Kiefer` does not invalidate the Lemma target. |
| S8 | `Bank 🏦`, `Die Bank vergab einen Kredit.` | Synonym: reject target `Bank`, `Lexeme/NOUN`, even with another intended Reading | A relation may not target the source Lemma itself. Polysemy does not waive the self-target rule. |

## Antonym and Near Antonym

| ID | Source Reading and context | Kind and judgment | Why |
| --- | --- | --- | --- |
| A1 | `sichtbar 👁️`, `Der Fleck ist sichtbar.` | Antonym: accept `unsichtbar`, `Lexeme/ADJ` | The pair is a conventional complementary opposition. The prefix is not the evidence; the independent semantic exclusion test is. |
| A2 | `öffnen 🚪`, `Sie öffnete die Tür.` | Antonym: accept `schließen`, `Lexeme/VERB` | The verbs are conventional reversives acting on the same state dimension. |
| A3 | `kaufen 🛒`, `Mara kauft das Fahrrad von Jo.` | Antonym: reject `verkaufen`; Near Antonym: accept `verkaufen`, `Lexeme/VERB` | Both describe the same transaction from exchanged participant viewpoints. They are established converses, not actions that negate or reverse each other. |
| A4 | `Käufer 🛒`, `Der Käufer bezahlte den Verkäufer.` | Antonym: reject `Verkäufer`; Near Antonym: accept `Verkäufer`, `Lexeme/NOUN` | German convention pairs the exchanged transaction roles while neither role negates or reverses the other. The established relational contrast passes Near Antonym, not strict Antonym. |
| A5 | `rot 🔴`, `Die Ampel ist rot.` | Antonym: `null`; Near Antonym: `null` | `grün` contrasts in traffic-light context and on one color wheel, but `rot` has no context-independent German lexical opposite. |
| A6 | `Hund 🐕`, `Der Hund schläft.` | Near Antonym: reject `Katze`, `Lexeme/NOUN` | Familiar cultural comparison and co-hyponymy do not create an established semantic opposition. |

## Hypernym and Hyponym

| ID | Source Reading and context | Kind and judgment | Why |
| --- | --- | --- | --- |
| T1 | `Pudel 🐩`, `Der Pudel wurde geschoren.` | Hypernym: accept `Hund`, `Lexeme/NOUN`; reject `Tier` | Every poodle is a dog. `Tier` is a true but redundant distant ancestor when `Hund` supplies the nearest useful category. |
| T2 | `Hund 🐕`, `Der Hund bellt.` | Hyponym: accept `Pudel`, `Lexeme/NOUN` | `Pudel → Hund` passes the Hypernym test. This edge is the inferred inverse, not a direct Dumgen output. |
| T3 | `Fahrrad 🚲`, `Das Fahrrad hat einen Platten.` | Hyponym: reject `Rad`, `Lexeme/NOUN`; Meronym: accept `Rad` | A wheel is a part of a bicycle, not a kind of bicycle. |
| T4 | `Pfote 🐾`, `Die Pfote ist verletzt.` | Hypernym: accept `Körperteil`; reject `Tier` | `Körperteil` answers “what kind of thing is it?” `Tier` answers “what whole conventionally bears it?” |
| T5 | `sprinten 🏃`, `Sie sprintete zum Ziel.` | Hypernym: accept `laufen`, `Lexeme/VERB` | Every sprinting event is a running event, and `laufen` is the nearest useful broader action. `sich bewegen` is too distant. |
| T6 | `laufen 🏃`, `Sie lief zum Ziel.` | Hyponym: accept `sprinten`, `Lexeme/VERB` | The intended sprinting events are a narrower class of running events. |
| T7 | `Berlin 🏙️`, `Berlin hat über drei Millionen Einwohner.` | Hypernym: accept `Stadt`, `Lexeme/NOUN`; reject `Deutschland` | Berlin is an instance of the category city. Germany is a stable containing geopolitical whole, not Berlin's category. |
| T8 | `Stadt 🏙️`, `Die Stadt wächst.` | Hyponym: accept `Berlin`, `Lexeme/PROPN` | The named referent is an instance of the source category. This is PROPN category/instance navigation in inverse direction. |
| T9 | `John 👤`, `John wartet draußen.` | Hypernym: `null` rather than `Person` | The category is true but trivial and supplies no useful lexical navigation. A more informative conventional category is absent from the Reading. |

## Meronym and Holonym

| ID | Source Reading and context | Kind and judgment | Why |
| --- | --- | --- | --- |
| P1 | `Fahrrad 🚲`, `Das Fahrrad steht im Hof.` | Meronym: accept `Rad`, `Lexeme/NOUN` | A wheel is a conventional structural part of a bicycle. This is inferred from the direct `Rad → Fahrrad` Holonym claim. |
| P2 | `Rad 🛞`, `Das Rad des Fahrrads ist verbogen.` | Holonym: accept `Fahrrad`, `Lexeme/NOUN` | The context identifies the bicycle-component Reading; the part-whole relation is conventional beyond this sentence. |
| P3 | `Fahrrad 🚲`, `Im Korb liegt eine Zeitung.` | Meronym: reject `Zeitung`, `Lexeme/NOUN` | A temporarily carried object is content, not an inherent or conventional part. |
| P4 | `Blutplasma 🩸`, `Das Blutplasma wurde untersucht.` | Holonym: accept `Blut`, `Lexeme/NOUN` | Plasma is a constitutive component substance of blood. |
| P5 | `Berlin 🏙️`, `Berlin ist die Hauptstadt Deutschlands.` | Holonym: accept `Deutschland`, `Lexeme/PROPN`; Hypernym: reject `Deutschland` | The city is stably and definitionally contained in the named geographic whole; it is not a kind of Germany. |
| P6 | `Deutschland 🇩🇪`, `Deutschland ist föderal organisiert.` | Meronym: accept `Berlin`, `Lexeme/PROPN` (federal-state Reading); Hyponym: reject `Berlin` | Berlin is a conventional member of the named federal whole. It is not a subtype of Germany. |
| P7 | `Kreuzberg 🗺️`, `Kreuzberg liegt südlich der Spree.` | Holonym: accept `Berlin`, `Lexeme/PROPN` | The district-to-city containment is stable and definitional. |
| P8 | `Hotel 🏨`, `Im Hotel wohnt heute eine Reisegruppe.` | Meronym: reject `Reisegruppe`, `Lexeme/NOUN` | Temporary occupants do not become members or parts of the building Reading. |
| P9 | `Student 🎓`, `Der Student arbeitet heute in der Bibliothek.` | Holonym: reject `Bibliothek`, `Lexeme/NOUN` | Current location is contingent. The source is not a conventional part or member of a library. |
| P10 | `Kalifornien 🐻`, `Kalifornien liegt am Pazifik.` | Holonym: accept `Vereinigte Staaten`, `Lexeme/PROPN` | The state is a stable administrative member of the named whole. The target remains one multi-member proper-noun Lexeme, not a Phraseme or three targets. |

## Polysemy isolation

The following judgments use the same source Lemma spellings but must remain
independent by Reading.

| ID | Exact source Reading | Accept | Reject |
| --- | --- | --- | --- |
| Y1 | `Bank 🏦` (financial institution) | Hypernym `Kreditinstitut`, `Lexeme/NOUN` | Hypernym `Sitzmöbel` |
| Y2 | `Bank 🪑` (bench) | Hypernym `Sitzmöbel`, `Lexeme/NOUN` | Hypernym `Kreditinstitut` |
| Y3 | `Schloss 🏰` (castle) | Hypernym `Gebäude`, `Lexeme/NOUN` | Hypernym `Schließvorrichtung` |
| Y4 | `Schloss 🔒` (lock) | Hypernym `Schließvorrichtung`, `Lexeme/NOUN` | Hypernym `Gebäude` |

An encounter such as `Die Bank brach zusammen` may identify the institution
Reading. It cannot make `zusammenbrechen` or another context word a relation
target, and it cannot donate the institution's Hypernym to the bench Reading.

## More required nulls

| Source Reading | Requested kind | Tempting target | Why `null` is required |
| --- | --- | --- | --- |
| `Donnerstag 📅` | Antonym | `Freitag` | Adjacent weekdays are co-members of a seven-way cycle, not opposites. |
| `Regen 🌧️` | Holonym | `Wolke` | Rain often comes from a cloud, but product/source is not part/whole. |
| `Schlüssel 🔑` | Meronym | `Schloss` | A key operates a lock; instrument association is not part/whole. |
| `essen 🍽️` | Holonym | `Restaurant` | A frequent event location is not a containing whole, and VERB is ineligible for Holonym. |
| `laut 🔊` | Synonym | `sehr` | One phrase such as `sehr laut` shows degree modification, not equivalence. |
| `Tomaten auf den Augen haben 🙈`, `Phraseme/Idiom` | Synonym | `sehen` | The Idiom means failing to notice something obvious; its topical verb is not an equivalent Reading. |

## Multiple-target adjudication

For `Pudel 🐩`, returning only Hypernym `Hund` is preferable to returning both
`Hund` and `Tier`: the second target repeats the same taxonomic axis at a more
distant level. For `Berlin 🏙️`, `Stadt` under Hypernym and `Deutschland` under
Holonym are both desirable because they express independent category and
containment axes. Putting `Deutschland` under both kinds is an invalid
cross-kind collision.

Alternative targets may be defensible without making all of them mandatory.
For each alternative, a corpus must record the target gloss and the exact test
it passes. An unexplained larger set is not higher recall; every extra target
is another precision claim.

## Reviewer consistency check

Before accepting a completed judgment, a second reader should be able to
answer all of these from the record alone:

1. Which exact source Reading was judged?
2. Which conventional target Reading does the Lemma target intend?
3. Which necessary relation test passed?
4. Which nearest competing relation kind failed, and why?
5. Would the claim still hold outside the encounter sentence?
6. Is the target Family and Kind permitted?
7. If the answer is `null`, why does each tempting candidate fail?

If any answer requires guessing, the judgment is not ready for a Golden
Corpus or human Relation Semantics gate.
