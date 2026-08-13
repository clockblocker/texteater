# DW candidates for the German VERB grammatical-resolution corpus

Research date: 2026-08-13

## Scope and method

These are 15 candidate cases drawn from 15 first-party German Deutsche Welle article pages. Each excerpt is one complete source sentence and no excerpt exceeds 25 whitespace-delimited words. The `<TARGET>` tags below are proposed annotations; they do not occur in the source.

Membership follows the current high-level Target Classification policy:

- perfect, future, and passive auxiliaries belong to the lexical `Lexeme/VERB` complex;
- modal auxiliaries remain separate `Lexeme/AUX` targets;
- inherently reflexive pronouns and governed prepositions are VERB members;
- incidental reflexive objects are context;
- detached separable prefixes are members.

The core-feature analyses are corpus proposals and should be reviewed when cases are promoted. All proposed orthographies are `Standard`.

## Candidates

### 1. Future, inherent reflexive, governed preposition

- Source: [Deutschland will sich doch an Ukraine-Manöver beteiligen](https://amp.dw.com/de/deutschland-nimmt-an-ukraine-man%C3%B6ver-teil-koalition-der-willigen-drohnen-abkommen-eu-von-der-leyen/a-77967914), 15 July 2026
- Exact sentence (14 words): "Deutschland wird sich an diesem Manöver beteiligen", sagte Regierungssprecher Stefan Kornelius der Deutschen Presse-Agentur.
- Members: `["wird", "sich", "an", "beteiligen"]`
- Marked context: `"Deutschland <TARGET>wird</TARGET> <TARGET>sich</TARGET> <TARGET>an</TARGET> diesem Manöver <TARGET>beteiligen</TARGET>", sagte Regierungssprecher Stefan Kornelius der Deutschen Presse-Agentur.`
- Lemma/core: `sich beteiligen`; `hasGovPrep: "an"`; `hasSepPrefix: null`; `lexicallyReflexive: "Yes"`
- Why: Future auxiliary and lexical infinitive are widely separated; inherent `sich` and governed `an` are members while the reporting verb remains context.

### 2. Separable finite verb with incidental reflexive object

- Source: [Krieg im Sudan: Gesundheitsversorgung im Exil](https://amp.dw.com/de/krieg-im-sudan-gesundheitsversorgung-im-exil/a-75817375), 6 February 2026
- Exact sentence (8 words): Zahnärztin Shimaa Mahmoud setzt sich eine Gesichtsmaske auf.
- Members: `["setzt", "auf"]`
- Marked context: `Zahnärztin Shimaa Mahmoud <TARGET>setzt</TARGET> sich eine Gesichtsmaske <TARGET>auf</TARGET>.`
- Lemma/core: `aufsetzen`; `hasGovPrep: null`; `hasSepPrefix: "auf"`; `lexicallyReflexive: null`
- Why: Detached prefix is distant from its stem. Dative `sich` is an ordinary recipient/benefactive object, not lemma material.

### 3. Reflexive perfect in a relative clause

- Source: [Das Entstehen einer neuen Weltordnung](https://amp.dw.com/de/das-entstehen-einer-neuen-weltordnung/a-77552455), 18 June 2026
- Exact sentence (17 words): Die Weltordnung, die sich nach dem Zweiten Weltkrieg etabliert hat, scheint an ihr Ende gekommen zu sein.
- Members: `["sich", "etabliert", "hat"]`
- Marked context: `Die Weltordnung, die <TARGET>sich</TARGET> nach dem Zweiten Weltkrieg <TARGET>etabliert</TARGET> <TARGET>hat</TARGET>, scheint an ihr Ende gekommen zu sein.`
- Lemma/core: `sich etablieren`; `hasGovPrep: null`; `hasSepPrefix: null`; `lexicallyReflexive: "Yes"`
- Why: Subordinate-clause order places the auxiliary after the participle; a second complex predicate remains unmarked context.

### 4. Reflexive perfect of a separable verb

- Source: [Goldpreis: Hype um “Papiergold” heizt Spekulation an](https://amp.dw.com/de/goldpreis-hype-um-papiergold-heizt-spekulation-an/a-74885073), 27 November 2025
- Exact sentence (15 words): Mittlerweile hat sich der Preis auf rund 4150 US-Dollar pro Feinunze eingependelt (Stand 27. November).
- Members: `["hat", "sich", "eingependelt"]`
- Marked context: `Mittlerweile <TARGET>hat</TARGET> <TARGET>sich</TARGET> der Preis auf rund 4150 US-Dollar pro Feinunze <TARGET>eingependelt</TARGET> (Stand 27. November).`
- Lemma/core: `sich einpendeln`; `hasGovPrep: null`; `hasSepPrefix: "ein"`; `lexicallyReflexive: "Yes"`
- Why: Auxiliary, reflexive pronoun, and prefixed participle are discontinuous around a long subject/complement span.

### 5. Perfect separable verb with governed preposition

- Source: [Welche Rolle spielen Digital Natives bei Tansanias Wahlen?](https://amp.dw.com/de/welche-rolle-spielen-digital-natives-bei-tansanias-wahlen/a-72886910), 13 June 2025
- Exact sentence (17 words): Die tansanische Wahlkommission hat die CHADEMA-Partei des Oppositionsführers Tundu Lissu von den Präsidentschafts- und Parlamentswahlen 2025 ausgeschlossen.
- Members: `["hat", "von", "ausgeschlossen"]`
- Marked context: `Die tansanische Wahlkommission <TARGET>hat</TARGET> die CHADEMA-Partei des Oppositionsführers Tundu Lissu <TARGET>von</TARGET> den Präsidentschafts- und Parlamentswahlen 2025 <TARGET>ausgeschlossen</TARGET>.`
- Lemma/core: `ausschließen`; `hasGovPrep: "von"`; `hasSepPrefix: "aus"`; `lexicallyReflexive: null`
- Why: Long real-world dependency with names and compounds; tests recovery of a governed preposition and separable lemma from the participle.

### 6. Separable finite verb in a reporting frame

- Source: [Ukraine: Historiker Schlögel warnt vor Spaltung Europas](https://amp.dw.com/de/ukraine-historiker-schl%C3%B6gel-warnt-vor-spaltung-europas/a-74248079), 16 October 2025
- Exact sentence (17 words): Die Eindrücke wirken noch nach, sagt der Historiker beim Treffen mit der DW in seiner Berliner Wohnung.
- Members: `["wirken", "nach"]`
- Marked context: `Die Eindrücke <TARGET>wirken</TARGET> noch <TARGET>nach</TARGET>, sagt der Historiker beim Treffen mit der DW in seiner Berliner Wohnung.`
- Lemma/core: `nachwirken`; `hasGovPrep: null`; `hasSepPrefix: "nach"`; `lexicallyReflexive: null`
- Why: Plural agreement must be read through a detached prefix; unrelated reporting `sagt` remains context.

### 7. Passive in a relative clause with governed preposition

- Source: [Europa ringt um die Zukunft der Rente](https://amp.dw.com/de/europa-ringt-um-die-zukunft-der-rente/a-74925391), 27 November 2025
- Exact sentence (22 words): Fest steht: Das alte Umlagesystem, bei dem die Beiträge der Angestellten direkt an die Rentner weitergeleitet werden, ist an seine Grenzen gekommen.
- Members: `["an", "weitergeleitet", "werden"]`
- Marked context: `Fest steht: Das alte Umlagesystem, bei dem die Beiträge der Angestellten direkt <TARGET>an</TARGET> die Rentner <TARGET>weitergeleitet</TARGET> <TARGET>werden</TARGET>, ist an seine Grenzen gekommen.`
- Lemma/core: `weiterleiten`; `hasGovPrep: "an"`; `hasSepPrefix: "weiter"`; `lexicallyReflexive: null`
- Why: Passive member order is preposition–participle–auxiliary in the subordinate clause; two other predicates remain context.

### 8. Future with a second nearby `wird`

- Source: [Willkommen im Jahr 2050: So könnte Berlin künftig aussehen](https://amp.dw.com/de/zukunft-stadtplanung-wie-werden-wir-leben-transport-nahrung-stadtentwicklung/a-74137152), 4 October 2025
- Exact sentence (19 words): Auch Emilia wird vermutlich schnell einen Job finden, sobald sie fertig mit ihrem Studium der nachhaltigen Mode sein wird.
- Members: `["wird", "finden"]`
- Marked context: `Auch Emilia <TARGET>wird</TARGET> vermutlich schnell einen Job <TARGET>finden</TARGET>, sobald sie fertig mit ihrem Studium der nachhaltigen Mode sein wird.`
- Lemma/core: `finden`; `hasGovPrep: null`; `hasSepPrefix: null`; `lexicallyReflexive: null`
- Why: The first `wird` belongs with `finden`; the later homograph belongs to a different subordinate predicate.

### 9. Modal exclusion from a passive lexical complex

- Source: [EU sichert sich Impfdosen für Europa](https://www.dw.com/de/eu-sichert-sich-300-millionen-biontech-impfdosen-f%C3%BCr-europa/a-55566897), 11 November 2020
- Exact sentence (21 words): Die Impfstofflieferung für die EU soll in den Produktionsstätten von Biontech in Deutschland sowie in Pfizers Werken in Belgien hergestellt werden.
- Members: `["hergestellt", "werden"]`
- Marked context: `Die Impfstofflieferung für die EU soll in den Produktionsstätten von Biontech in Deutschland sowie in Pfizers Werken in Belgien <TARGET>hergestellt</TARGET> <TARGET>werden</TARGET>.`
- Lemma/core: `herstellen`; `hasGovPrep: null`; `hasSepPrefix: "her"`; `lexicallyReflexive: null`
- Why: Modal `soll` is a separate AUX target, while passive `werden` belongs to the lexical VERB realization.

### 10. Pluperfect across an embedded clause boundary

- Source: [Ägäis-Konflikt: “Die Türkei schafft Fakten”](https://www.dw.com/de/%C3%A4g%C3%A4is-konflikt-die-t%C3%BCrkei-schafft-fakten/a-62910995), 24 August 2022
- Exact sentence (24 words): Die Grünen hatten in ihrem Wahlprogramm angekündigt, dass sie gegenüber der Türkei eine prinzipienfestere Politik verfolgen und stärker auf Menschenrechte und Rechtsstaatlichkeit achten wollen.
- Members: `["hatten", "angekündigt"]`
- Marked context: `Die Grünen <TARGET>hatten</TARGET> in ihrem Wahlprogramm <TARGET>angekündigt</TARGET>, dass sie gegenüber der Türkei eine prinzipienfestere Politik verfolgen und stärker auf Menschenrechte und Rechtsstaatlichkeit achten wollen.`
- Lemma/core: `ankündigen`; `hasGovPrep: null`; `hasSepPrefix: "an"`; `lexicallyReflexive: null`
- Why: Pluperfect members precede several embedded verbs; the infinitives and modal in the complement clause must stay context.

### 11. Present passive with a distant participle

- Source: [Neues Klimaschutzpaket für Deutschland “nicht ausreichend”](https://amp.dw.com/de/klimamassnahmen-co2-deutschland-klimaschutz-reicht-nicht-aus-klimaklage-w%C3%A4rmepumpe-verkehr/a-76527298), 25 March 2026
- Exact sentence (13 words): Diese Erfolge werden jedoch von den steigenden Emissionen im Verkehrs- und Gebäudesektor aufgefressen.
- Members: `["werden", "aufgefressen"]`
- Marked context: `Diese Erfolge <TARGET>werden</TARGET> jedoch von den steigenden Emissionen im Verkehrs- und Gebäudesektor <TARGET>aufgefressen</TARGET>.`
- Lemma/core: `auffressen`; `hasGovPrep: null`; `hasSepPrefix: "auf"`; `lexicallyReflexive: null`
- Why: Long passive agent phrase separates auxiliary and lexical head; prefixed participle must normalize to `auffressen`.

### 12. Perfect, inherent reflexive, governed preposition, separable prefix

- Source: [Kein europäisches Urteil zur Sterbehilfe](https://www.dw.com/de/kein-europ%C3%A4isches-urteil-zur-sterbehilfe/a-16100150), 19 July 2012
- Exact sentence (20 words): Der Deutsche Ärztetag, die Vertretung der Mediziner in Deutschland, hat sich für ein Verbot jeder Form der organisierten Sterbehilfe ausgesprochen.
- Members: `["hat", "sich", "für", "ausgesprochen"]`
- Marked context: `Der Deutsche Ärztetag, die Vertretung der Mediziner in Deutschland, <TARGET>hat</TARGET> <TARGET>sich</TARGET> <TARGET>für</TARGET> ein Verbot jeder Form der organisierten Sterbehilfe <TARGET>ausgesprochen</TARGET>.`
- Lemma/core: `sich aussprechen`; `hasGovPrep: "für"`; `hasSepPrefix: "aus"`; `lexicallyReflexive: "Yes"`
- Why: Four source-ordered members exercise every lexical-core feature alongside perfect morphology.

### 13. Three-part perfect passive

- Source: [Wieder erschüttert Todesfall die K-Pop-Szene](https://amp.dw.com/de/wieder-ersch%C3%BCttert-todesfall-die-k-pop-szene/a-51524053), 4 December 2019
- Exact sentence (21 words): In Südkorea ist der junge Musiker und Schauspieler Cha In-ha (Artikelbild) tot in seinem Haus in der Hauptstadt Seoul aufgefunden worden.
- Members: `["ist", "aufgefunden", "worden"]`
- Marked context: `In Südkorea <TARGET>ist</TARGET> der junge Musiker und Schauspieler Cha In-ha (Artikelbild) tot in seinem Haus in der Hauptstadt Seoul <TARGET>aufgefunden</TARGET> <TARGET>worden</TARGET>.`
- Lemma/core: `auffinden`; `hasGovPrep: null`; `hasSepPrefix: "auf"`; `lexicallyReflexive: null`
- Why: Three verbal members span a realistic proper-name and location-heavy sentence; tests perfect-passive stacking.

### 14. Pluperfect passive

- Source: [USA lockern weiter Sanktionen gegen russisches Öl](https://amp.dw.com/de/usa-lockern-weiter-sanktionen-gegen-russischen-oel/a-76841076), 18 April 2026
- Exact sentence (14 words): Durch die Meerenge war zuvor fast ein Fünftel des weltweit verbrauchten Rohöls verschifft worden.
- Members: `["war", "verschifft", "worden"]`
- Marked context: `Durch die Meerenge <TARGET>war</TARGET> zuvor fast ein Fünftel des weltweit verbrauchten Rohöls <TARGET>verschifft</TARGET> <TARGET>worden</TARGET>.`
- Lemma/core: `verschiffen`; `hasGovPrep: null`; `hasSepPrefix: null`; `lexicallyReflexive: null`
- Why: Contrasts pluperfect passive `war … worden` with perfect passive `ist … worden` without adding lexical-core complexity.

### 15. Finite separable, inherent reflexive, governed preposition

- Source: [Bundeswehr bereitet Einsatz in der Straße von Hormus vor](https://amp.dw.com/de/bundeswehr-bereitet-einsatz-in-der-stra%C3%9Fe-von-hormus-vor/a-77604603), 18 June 2026
- Exact sentence (14 words): Die Bundeswehr bereitet sich auf einen möglichen Minenräum-Einsatz in der Straße von Hormus vor.
- Members: `["bereitet", "sich", "auf", "vor"]`
- Marked context: `Die Bundeswehr <TARGET>bereitet</TARGET> <TARGET>sich</TARGET> <TARGET>auf</TARGET> einen möglichen Minenräum-Einsatz in der Straße von Hormus <TARGET>vor</TARGET>.`
- Lemma/core: `sich vorbereiten`; `hasGovPrep: "auf"`; `hasSepPrefix: "vor"`; `lexicallyReflexive: "Yes"`
- Why: Four discontinuous finite members combine reflexivity, government, and a detached prefix in a natural news sentence.

## Suggested future selection mix

For demonstrations, candidates 9, 12, and 13 teach the highest-value boundaries: modal exclusion, lexical members beyond verb words, and stacked perfect/passive auxiliaries. Candidate 2 is a strong fourth demonstration because it contrasts an incidental `sich` with the inherent reflexives.

For held-out evaluation, retain several paired contrasts:

- inherent reflexive (1, 3, 4, 12, 15) versus incidental reflexive (2);
- future (1, 8), perfect/pluperfect (3–5, 10, 12), passive (7, 9, 11), and perfect/pluperfect passive (13–14);
- finite detached prefixes (2, 6, 15) versus fused prefixed participles (4–5, 10–13).

All 15 cases are promoted only to the corpus-level `dwArticles` collection. Candidates 5 and 7 deliberately exercise governed-preposition membership under the agreed contract that Target Classification has already supplied the members.
