# German Semantic Relation: Primary-Source Review

This note checks the difficult retained examples in the Semantic Relation corpus against first-party lexical and institutional sources. It is evidence for human adjudication, not a replacement for the judgment contract. Dictionary entries establish senses, usage labels, and some named relations; they rarely establish that **no** semantic relation exists, and their use of *Synonym* is broader than the corpus's exact-synonym category.

Research date: 2026-08-20.

## Terminological anchors

IDS Grammis defines synonymy as extensive identity on the content side and explicitly allows regional, stylistic, and technical variants. It also says that the existence of complete synonymy is doubtful. The corpus's split between exact and near synonymy is therefore a stricter editorial policy, not a distinction directly licensed by this source. See [IDS Grammis: Synonymie](https://grammis.ids-mannheim.de/terminologie/263).

IDS treats polysemy as lexical ambiguity and explains that context contributes to monosemization. Its homonymy entry gives exactly the kinds of sense splits relevant here: *Schloss* as a building versus a locking device, *Kiefer* as pine versus jaw, and *Bank* as a credit institution versus seating. These sources strongly support judging relations between **readings**, not transferring a relation from one reading of a lemma to another. See [IDS Grammis: Polysemie](https://grammis.ids-mannheim.de/terminologie/534) and [IDS Grammis: Homonymie](https://grammis.ids-mannheim.de/terminologie/510).

IDS defines converse predicates or relations as involving the same arguments with different assignment or perspective; its systematic grammar uses greater-than/smaller-than as an example. This supports treating transaction pairs separately from ordinary opposites, although mapping that distinction to the corpus label `Near Antonym` remains a project decision. See [IDS Grammis: konvers](https://grammis.ids-mannheim.de/terminologie/1005) and [IDS Grammis: converse relations](https://grammis.ids-mannheim.de/systematische-grammatik/2130).

## Exact versus near synonymy

| Retained case | Primary-source evidence | Consequence for the corpus |
| --- | --- | --- |
| *Hubschrauber* / *Helikopter* | Duden lists *Helikopter* directly under the synonyms of *Hubschrauber*. [Duden: Hubschrauber synonyms](https://www.duden.de/synonyme/Hubschrauber) | Lexical equivalence is supported. The stronger assertion that there is no systematic register, domain, or distributional difference is not established by this entry and remains an exact-synonym adjudication. |
| *Samstag* / *Sonnabend* | Duden defines *Sonnabend* as the sixth day of the week, lists *Samstag* as a synonym, and marks *Sonnabend* regional, especially northern and central German. [Duden: Sonnabend](https://www.duden.de/rechtschreibung/Sonnabend) | The common denotation is supported; the regional marking supports `Near Synonym`, not exact synonymy under the corpus's stricter policy. |
| *Föhre* / *Kiefer* | Duden defines *Föhre* as *Kiefer* and marks it Austrian or otherwise regional. [Duden: Föhre](https://www.duden.de/rechtschreibung/Foehre) | The regional distribution is directly supported and makes `Near Synonym` defensible. The *Kiefer* tree reading must be explicit because IDS documents the jaw homonym. |
| *Pfote* / *Tatze* | Duden defines *Pfote* as the toe-divided foot of various mammals and *Tatze* as the paw of a larger predator, especially a bear; the entries cross-list the terms. [Duden: Pfote](https://www.duden.de/rechtschreibung/Pfote), [Duden: Tatze](https://www.duden.de/rechtschreibung/Tatze) | Overlap plus a narrower animal distribution supports `Near Synonym`. Duden's “salopp, oft abwertend” label belongs to the separate human-hand sense of *Tatze* and does **not** support describing the animal reading as coarse or affectionate. |
| *klug* / *intelligent* | Duden defines *intelligent* through possession or display of intelligence. *Klug* has several readings: intellectually capable, educated or wise, and sensible or tactically appropriate. [Duden: intelligent](https://www.duden.de/rechtschreibung/intelligent), [Duden: klug](https://www.duden.de/rechtschreibung/klug) | A near relation is plausible only after fixing the intended reading. In *kluge Entscheidung*, the “sensible/appropriate” reading may be active; the gloss should not leave this underspecified. |
| *ab und zu* / *hin und wieder* | Duden uses both expressions in the definition of *bisweilen* and lists both for *manchmal*. [Duden: bisweilen](https://www.duden.de/rechtschreibung/bisweilen), [Duden: manchmal](https://www.duden.de/rechtschreibung/manchmal) | Shared occasional-frequency meaning is supported. Exact equality of register and distribution is not established, so `Exact Synonym` needs human confirmation. |
| *ins Gras beißen* / *sterben* | Duden marks the phrase *ins Gras beißen* as *salopp* and defines it as *sterben*. [Duden: Gras](https://www.duden.de/rechtschreibung/Gras) | Central meaning plus a register difference is strongly supported, hence `Near Synonym`. Replace any stronger “humorous” claim with the sourced label *salopp* unless another primary source is added. |

## Antonymy and converse relations

Duden directly lists *schließen* as an antonym of *öffnen* and *öffnen* as an antonym of *schließen*. This is the strongest sourced `Exact Antonym` case in the retained set. See [Duden: öffnen](https://www.duden.de/rechtschreibung/oeffnen) and [Duden: schließen](https://www.duden.de/rechtschreibung/schlieszen).

Duden defines *kaufen* as acquiring something against payment and *verkaufen* as transferring something to someone as property for payment. Combined with the IDS definition of converse relations, this supports the analysis that the verbs describe one transaction from reversed participant perspectives rather than mutually exclusive states. Labeling that analysis `Near Antonym` is a defensible project mapping, but neither source applies that label itself. See [Duden: kaufen](https://www.duden.de/rechtschreibung/kaufen), [Duden: verkaufen](https://www.duden.de/rechtschreibung/verkaufen), and the IDS converse sources above.

The analogous *Käufer* / *Verkäufer* judgment is semantically well motivated by transaction roles, but this review did not locate a primary source explicitly classifying that noun pair as converse. Retain it only as a reviewer-adjudicated example, not as a source-certified relation.

The null judgments *rot* / *grün* and *Hund* / *Katze* cannot be proved by dictionary silence. They are defensible because co-hyponyms do not automatically become antonyms under the judgment contract, but they remain human semantic judgments.

## Taxonomy versus part-whole

| Retained case | Primary-source evidence | Consequence for the corpus |
| --- | --- | --- |
| *Pudel* → *Hund* | Duden defines *Pudel* as a medium-sized dog. [Duden: Pudel](https://www.duden.de/rechtschreibung/Pudel) | Strong support for `Hypernym` with target *Hund*. |
| *sprinten* → *laufen* | Duden defines *sprinten* as covering a short distance at the highest speed and, colloquially, running fast. [Duden: sprinten](https://www.duden.de/rechtschreibung/sprinten) | Strong support for an event-type `Hypernym` relation to *laufen*. |
| *Fahrrad* → *Rad* | Duden defines a bicycle as a two-wheeled vehicle and a wheel as the circular rotating vehicle part on which it moves. The *Rad* entry also has the distinct colloquial sense “bicycle.” [Duden: Fahrrad](https://www.duden.de/rechtschreibung/Fahrrad), [Duden: Rad](https://www.duden.de/rechtschreibung/Rad_Fahrrad) | Strong `Meronym` support only if the target gloss selects the wheel-part reading. Without that gloss, the pair is ambiguous between part-whole and synonymy. |
| *Blutplasma* → *Blut* | Duden defines *Blutplasma* as the liquid component of blood. [Duden: Blutplasma](https://www.duden.de/rechtschreibung/Blutplasma) | Direct support for `Holonym` with target *Blut*. |
| *Pfote* → *Tier* | Duden defines *Pfote* as the foot of various mammals. [Duden: Pfote](https://www.duden.de/rechtschreibung/Pfote) | An animal bearer is supported. Choosing *Tier* as the nearest useful whole rather than an anatomical intermediate is corpus policy, not a fact stated by Duden. |
| financial *Bank* → *Kreditinstitut* | Duden describes a bank as an enterprise conducting money and credit business. Its *Kreditinstitut* entry describes an enterprise conducting credit business and lists *Bank* and *Geldinstitut* as synonyms. [Duden: Bank](https://www.duden.de/rechtschreibung/Bank_Geldinstitut), [Duden: Kreditinstitut](https://www.duden.de/rechtschreibung/Kreditinstitut) | The proposed `Hypernym` is not an unambiguous benchmark: Duden treats the terms synonymously in ordinary lexicography. German law defines credit institutions as enterprises conducting banking business, but that formal category does not resolve the lexical ambiguity. [Kreditwesengesetz § 1](https://www.gesetze-im-internet.de/kredwg/BJNR008810961.html) |

These sources also illustrate why a shared real-world domain does not establish part-whole. Duden defines a *Schlüssel* as an object used to open or close a lock; that is an instrument relation, not evidence that the key is a component of the lock. [Duden: Schlüssel](https://www.duden.de/rechtschreibung/Schluessel)

## Proper names and containment

Berlin requires explicit reading control. The Constitution of Berlin states that Berlin is a German Land and simultaneously a city. The official economic portal calls it Germany's largest city. Thus *Berlin* → *Stadt* is a taxonomic judgment on the city reading, while *Berlin* → *Deutschland* is stable administrative containment on the Land reading. Both facts are supported, but treating them as separate corpus readings is essential. See [Constitution of Berlin, Article 1](https://www.berlin.de/rbmskzl/politik/senat/verfassung/verfassung-von-berlin-abschnitt-i-die-grundlagen-41549.php) and [Berlin economic location](https://www.berlin.de/wirtschaft/wirtschaftsstandort/).

Official district material identifies Kreuzberg as an *Ortsteil* within the Friedrichshain-Kreuzberg district, and Berlin's official city portal calls it a central *Stadtteil*. This supports stable *Kreuzberg* → *Berlin* containment. See [Friedrichshain-Kreuzberg district data](https://www.berlin.de/ba-friedrichshain-kreuzberg/politik-und-verwaltung/service-und-organisationseinheiten/bezirkliche-planung-und-koordinierung/sozialraumorientierte-planungskoordination/daten/) and [Berlin.de: Kreuzberg](https://www.berlin.de/special/stadtteile/kreuzberg/881280-5170818-wohnlagen-infrastruktur.html).

The U.S. Census Bureau identifies California as the 31st state admitted to the Union. This supports the real-world containment/member fact behind *California* → *USA*. It does not establish the German target lemma, inflection family, or canonical-form conventions, which remain project data. See [U.S. Census Bureau: California geography guide](https://www.census.gov/geographies/reference-files/2010/geo/state-local-geo-guides-2010/california.html).

The corpus should not generalize from these administratively fixed cases to arbitrary person/class pairs. The rejection of *John* → *Person* is a corpus usefulness policy; external sources can establish that a named individual is a person but cannot establish the project's rule against such targets.

## Polysemy and phrasemes

The IDS homonymy entry directly validates the separation of financial and seating *Bank*, building and locking-device *Schloss*, and pine and jaw *Kiefer*. Duden likewise separates financial *Bank* from seating *Bank* and documents both principal senses of *Schloss*. See [Duden: financial Bank](https://www.duden.de/rechtschreibung/Bank_Geldinstitut), [Duden: Sitzbank](https://www.duden.de/rechtschreibung/Sitzbank), and [Duden: Schloss](https://www.duden.de/rechtschreibung/Schloss). These are strong primary-source anchors for sense-specific fixtures.

Duden's treatment of *ins Gras beißen* as a phrase meaning *sterben* supports a relation from the **whole phraseme** to *sterben*, not from the token *Gras*. Duden marks *Tomaten auf den Augen haben* as *salopp, abwertend* and defines it as overlooking something or someone through inattention. That proposition is not equivalent to the bare verb *sehen*, supporting the retained null judgment. See [Duden: Gras](https://www.duden.de/rechtschreibung/Gras) and [Duden: Tomate](https://www.duden.de/rechtschreibung/Tomate).

## Claims that remain unsupported or only partly supported

The following claims should be recorded as reviewer judgments rather than presented as conclusions of the cited sources:

- Absolute null claims based on the absence of a dictionary relation: *Donnerstag* / *Freitag*, *rot* / *grün*, *Hund* / *Katze*, *Regen* / *Wolke*, *Hotel* / *Reisegruppe*, and *Student* / *Bibliothek*.
- Exact synonymy for *Hubschrauber* / *Helikopter* and *ab und zu* / *hin und wieder*. The sources establish shared meaning or cross-listing, but not identical register and distribution.
- The description of animal-sense *Tatze* as coarse or affectionate. The available Duden label applies to its human-hand sense.
- A “humorous” label for *ins Gras beißen*. The primary source checked supports *salopp*, not specifically humorous.
- `Hypernym` for financial *Bank* → *Kreditinstitut*. Duden's synonym treatment makes the example contested under the corpus's strict taxonomy.
- The exact label `Near Antonym` for *kaufen* / *verkaufen* and *Käufer* / *Verkäufer*. Converse structure is supported; the label mapping belongs to the project.
- Selecting *Tier* rather than an anatomical intermediate as the useful whole for *Pfote*.
- Rejecting *John* → *Person*. This is a product-policy boundary rather than a lexicographic fact.
- Eligibility-driven nulls such as a verb source (*essen* → *Restaurant*) or degree modifier (*laut* / *sehr*). These follow the judgment contract's source-shape rules and need no external lexical claim, but should not be described as dictionary findings.

## Recommended adjudication changes

Retain the directly evidenced cases: *Samstag* / *Sonnabend*, *Föhre* / *Kiefer* with the tree reading, *ins Gras beißen* / *sterben*, *öffnen* / *schließen*, *Pudel* → *Hund*, *sprinten* → *laufen*, *Fahrrad* → wheel-sense *Rad*, *Blutplasma* → *Blut*, the sense-isolation cases, and the documented proper-name containment cases.

Tighten the fixtures and explanations by:

1. replacing “colloquial, humorous” for *ins Gras beißen* with the sourced *salopp*;
2. removing the unsupported coarse/affectionate characterization of animal-sense *Tatze* and relying on its distribution over larger predators;
3. making the intended senses of *klug*, *Kiefer*, *Rad*, and both uses of *Berlin* explicit;
4. marking *Hubschrauber* / *Helikopter* and *ab und zu* / *hin und wieder* as exact-synonym reviewer gates rather than source-settled cases; and
5. replacing or explicitly flagging financial *Bank* → *Kreditinstitut* as contested, because a primary dictionary treats the pair synonymously.
