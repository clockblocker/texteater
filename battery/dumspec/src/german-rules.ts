import type { Rule, RuleRoute } from "./types.js";

const lexeme = (...kinds: RuleRoute["kind"][]): RuleRoute[] =>
	kinds.map((kind) => ({ language: "de", family: "Lexeme", kind }));
const locution = (...kinds: RuleRoute["kind"][]): RuleRoute[] =>
	kinds.map((kind) => ({ language: "de", family: "Locution", kind }));
const everyLocution = locution(
	"VERB",
	"NOUN",
	"ADJ",
	"ADV",
	"ADP",
	"CCONJ",
	"SCONJ",
	"DET",
	"PRON",
	"NUM",
	"INTJ",
);
const saying: RuleRoute[] = [
	{ language: "de", family: "Saying", kind: "Saying" },
];
const everyMultiword = [...everyLocution, ...saying];

/** Which Segments form one unit, whatever its route. */
const units: Rule[] = [
	{
		id: "de/largest-fixed-unit",
		statement:
			"A click on a word selects the largest complete fixed unit that contains it. Every fixed member selects the same unit, and the unit is found by position in the sentence, never by spelling.",
		adrs: ["ADR-0004", "ADR-0009", "dumgen/ADR-0007"],
		routes: [],
		records: [],
	},
	{
		id: "de/fixed-members-only",
		statement:
			"A unit's members are the words it fixes, function words included. Free arguments, modifiers, fillers, punctuation and opaque text stay outside. Words are not fixed just because they stand together, often occur together or form an ordinary compositional phrase.",
		adrs: ["ADR-0004"],
		routes: [],
		records: [],
	},
	{
		id: "de/locutions-and-sayings-are-made-of-lexemes",
		statement:
			"Every word belongs to exactly one target: the biggest unit it is part of. A word inside a Locution or a Saying has no target of its own in the sentence; the multiword unit leads to it through the Lemma's Breakdown.",
		adrs: ["ADR-0041", "dumgen/ADR-0007"],
		routes: everyMultiword,
		records: [],
	},
	{
		id: "de/unresolved-over-repair",
		statement:
			"A target is right only when its members are exactly the complete fixed unit the sentence realizes: no fixed member that is present is left out, and no free word is added. When membership is uncertain or contradictory, the answer is Unresolved; the group is never trimmed, extended or repaired.",
		adrs: ["ADR-0004"],
		routes: [],
		records: [],
	},
	{
		id: "de/no-target",
		statement:
			"A word has no target when no route for it is defensible: unintelligible text that no German word, name or plausible typo fits (xqzt), or a suspended-compound fragment with no right conjunct to complete it. The classifier answers Unresolved for it.",
		adrs: ["ADR-0037"],
		routes: [],
		records: ["de/das-wetter-ist-xqzt"],
	},
];

const verbs: Rule[] = [
	{
		id: "de/verb-owns-its-scattered-members",
		statement:
			"A verb's target includes its separable particle, its inherently required reflexive and the auxiliaries of its own perfect, future and passive, wherever they stand: zog … an gives [zog, an] VERB anziehen. An optional reflexive object is a PRON target of its own.",
		adrs: ["ADR-0004", "ADR-0022"],
		routes: lexeme("VERB"),
		records: ["de/es-zog-der-wilde-jaegersmann", "de/pass-auf-dich-auf"],
	},
	{
		id: "de/expletive-es-joins-its-verb",
		statement:
			"A subject es that the verb selects and that refers to nothing belongs to the verb's target: es gibt (Lemma geben), es regnet, es geht um, es handelt sich um. It stays a member across word order changes and free words in between. Referential es, positional es (Es kamen Gäste), anticipatory es (Es freut mich, dass du kommst) and object es (Sie meint es gut mit dir) are PRON targets of their own. An omitted es is never added.",
		adrs: ["ADR-0022"],
		routes: lexeme("VERB", "PRON"),
		records: [],
	},
	{
		id: "de/governed-preposition-joins-its-governor",
		statement:
			"A preposition that a verb, adjective or noun selects for its complement is a member of that word's target, also when it stands apart: in Pass auf dich auf the first auf belongs to aufpassen, and Auf ihn bin ich stolz gives [stolz, auf] ADJ. It joins the smallest unit its government survives in: aus Angst vor Hunden gives [Angst, vor] NOUN, and hat Angst vor Hunden gives the Collocation Angst haben. It is never part of the Lemma: warten auf is warten. A free adjunct preposition (wartet im Keller) is not a member.",
		adrs: ["ADR-0029", "ADR-0034"],
		routes: [
			...lexeme("VERB", "ADJ", "NOUN"),
			...locution("VERB", "ADJ", "NOUN"),
		],
		records: ["de/pass-auf-dich-auf"],
	},
	{
		id: "de/bracket-particle-or-circumposition",
		statement:
			"A directional word (vorbei, hinaus, herum, entlang, an, aus) in the verbal bracket is the verb's separable particle when verb and word form a dictionary particle verb in this sense, also after a prepositional phrase: führt an der Schule vorbei gives [führt, an, vorbei] VERB vorbeiführen, with an as its governed preposition, and so do reicht über … hinaus (hinausreichen) and kommt um … nicht herum (herumkommen). Preposition and word form a circumposition, a Locution ADP, only as one constituent outside the bracket (Über die Zusicherung hinaus gab er nach, der Weg an der Kirche vorbei gives [an, vorbei] an … vorbei) or when no such particle verb exists: um … willen, von … an, Von der Terrasse aus sieht man den See (not aussehen).",
		adrs: ["ADR-0004", "ADR-0022", "ADR-0034", "ADR-0039"],
		routes: [...lexeme("VERB"), ...locution("ADP")],
		records: [
			"de/der-radweg-fuehrt-an-der-schule-vorbei",
			"de/die-wirkung-reicht-ueber-das-jahr-hinaus",
			"de/der-weg-an-der-kirche-vorbei-ist-gesperrt",
			"de/von-der-terrasse-aus-sieht-man-den-see",
			"de/um-des-friedens-willen-schwiegen-beide-seiten",
			"de/von-diesem-tag-an-fuehrte-sie-das-protokoll",
		],
	},
	{
		id: "de/pronominal-adverb-stands-alone",
		statement:
			"A pronominal adverb (darauf, davon, dazu, damit, worauf, hierfür) stands for a whole prepositional phrase. It is always a single-member ADV and never joins a verb or adjective, even one that governs the preposition inside it: wartet darauf gives [wartet] VERB and [darauf] ADV.",
		adrs: ["ADR-0029", "ADR-0034"],
		routes: lexeme("ADV"),
		records: [],
	},
	{
		id: "de/modal-is-a-verb",
		statement:
			"A modal (dürfen, können, mögen, müssen, sollen, wollen) is a VERB with its own meaning, whether or not an infinitive follows. It owns the auxiliaries that serve it, and the infinitive it governs is a separate VERB target: hat … schreiben müssen gives [hat, müssen] and [schreiben]. Verbs that add a meaning beside a construction (sich lassen, gehören with a participle, brauchen, scheinen, drohen, versprechen or pflegen with zu, copular bleiben) are VERBs in the same way.",
		adrs: ["ADR-0026", "ADR-0022"],
		routes: lexeme("VERB"),
		records: ["de/er-muss-heute-arbeiten"],
	},
	{
		id: "de/auxiliary-joins-the-verb-it-serves",
		statement:
			"sein, haben or werden marking perfect, future or passive is never a target on its own. It joins the verb it serves as that unit's auxiliary, and a click on it selects that verb. Standing alone, the same verbs are VERBs with their own meaning: copular sein, haben 'to own', werden 'to become'.",
		adrs: ["ADR-0026", "ADR-0022"],
		routes: lexeme("VERB", "AUX"),
		records: [
			"de/der-faehrmann-hat-uns-uebergesetzt",
			"de/wir-haetten-gern-mehr-zeit",
		],
	},
	{
		id: "de/copula-stays-apart",
		statement:
			"A copula (sein, werden, bleiben, scheinen, wirken, sich zeigen) never joins its predicate: in Das Wetter ist schön, ist is a single-member VERB and schön an ADJ of its own. A copula and a predicative adjective never form a Collocation, so Er ist stolz auf seinen Sohn gives [ist] VERB and [stolz, auf] ADJ.",
		adrs: ["ADR-0026", "ADR-0034", "ADR-0036"],
		routes: [...lexeme("VERB", "ADJ"), ...locution("VERB")],
		records: [
			"de/das-wetter-ist-xqzt",
			"de/er-wog-vielleicht-ein-halbes-lot",
		],
	},
	{
		id: "de/recipient-passive",
		statement:
			"bekommen, kriegen or erhalten with a Partizip II that adds nothing lexical is the recipient passive and joins the participle's verb: bekommt … geliefert is one VERB target. Lexical bekommen with an object (Sie bekommt ein Paket) and resultative bekommen (Sie bekommt das Glas geöffnet, she manages to open it) are the VERB, and the participle stays outside.",
		adrs: ["ADR-0026", "ADR-0036"],
		routes: lexeme("VERB", "AUX"),
		records: [],
	},
];

const participles: Rule[] = [
	{
		id: "de/verbal-participle",
		statement:
			"A participle is verbal only in a perfect with haben or sein (hat gebacken, ist abgereist) or a passive with werden, bekommen, kriegen or erhalten (wird gebacken). There it joins its auxiliaries in one VERB target: ist … aufgefunden worden includes all three.",
		adrs: ["ADR-0036", "ADR-0022"],
		routes: lexeme("VERB"),
		records: [],
	},
	{
		id: "de/sein-perfect-or-copula",
		statement:
			"sein with a participle is a perfect only when the clause reports the verb's own event, so the simple past says the same: ist abgefahren is fuhr ab. Otherwise sein is the copula and the participle an ADJ describing a state, the state passive included: Das Fenster ist geöffnet gives [ist] VERB and [geöffnet] ADJ, and Sie ist verärgert gives verärgert ADJ with no reflexive.",
		adrs: ["ADR-0036"],
		routes: lexeme("VERB", "ADJ"),
		records: [],
	},
	{
		id: "de/participial-adjective",
		statement:
			"A participle outside a perfect or passive is a single-member ADJ: attributive (die gebratenen Zwiebeln), adverbial (ging pfeifend davon) or predicative (wirkte erschöpft). Lexicalized participles such as überzeugend and gelassen are ADJ too. The participle's own objects, adverbs, agents and prepositional phrases are free words: in der von allen gelobte Koch, only gelobte is the target. A substantivized participle or adjective is a NOUN, capitalized and owning its article like any noun: der Reisende, der Alte, das Gute, die Reichen. Its ending follows the determiner (der Alte, ein Alter), and the Surface's letters record it. A participle or adjective whose noun is elided stays lowercase and ADJ, and it owns the article as the Head of its phrase: der alte in tiefer als der alte gives [der, alte] ADJ.",
		adrs: ["ADR-0036", "ADR-0040"],
		routes: lexeme("ADJ", "NOUN"),
		records: [
			"de/der-reisende-wartete-draussen",
			"de/der-reisende-haendler-wartete-draussen",
			"de/der-neue-brunnen-ist-tiefer-als-der-alte",
		],
	},
];

const nouns: Rule[] = [
	{
		id: "de/noun-owns-its-article",
		statement:
			"The Head of a noun phrase owns the article that opens it, even across adjectives and numerals, and a click on the article selects the Head. The Head is the noun: der steile Aufstieg gives [der, Aufstieg] NOUN and [steile] ADJ, and Die drei Mädchen gives [Die, Mädchen]. When the noun is elided, the word standing in for it is the Head: Ich nehme den roten gives [den, roten] ADJ, and Der meine gives [Der, meine] PRON. An article cut off from its Head by a verb, a clause boundary or another noun is not its article: in Der Weg ist das Ziel, Weg gives [Der, Weg]. A bare Head stays bare. The article is a member, never a feature: a noun's Surface records no article, and in a sentence it marks case and number. A noun whose Lemma has gender null, such as an adjectival noun for a person, marks on a singular Surface the gender its form shows, and the article agrees with that: der Reisende and ein Verletzter mark Masc, die Angestellte Fem. A plural marks none. The article's spelling, read through its fused or shortened form, names a cell of der or ein for its Head's case, number and gender, and that cell is its DET: im Wald gives m, which is dem Dat.Masc.Sg.",
		adrs: ["ADR-0004", "ADR-0009", "ADR-0035", "ADR-0040", "ADR-0041"],
		routes: lexeme("NOUN", "PROPN", "ADJ", "NUM", "PRON"),
		records: [
			"de/das-wetter-ist-xqzt",
			"de/es-zog-der-wilde-jaegersmann",
			"de/ich-bin-im-wald",
			"de/die-drei-maedchen-spielen-draussen",
			"de/der-neue-brunnen-ist-tiefer-als-der-alte",
			"de/der-reisende-wartete-draussen",
			"de/ein-verletzter-lag-am-strassenrand",
			"de/am-naechsten-morgen-war-alles-anders",
			"de/das-kind-spielt-im-garten",
			"de/er-zaehlt-eins-und-kauft-danach-einen-mantel",
		],
	},
	{
		id: "de/only-der-and-ein-are-articles",
		statement:
			"Only forms of der, die, das and ein are articles, including the article piece of a fused word (m in im) and a shortened article ('ne, 'nen). mein, dieser, kein and other determiners are DETs of their own: kein Haus gives [kein] DET and [Haus] NOUN.",
		adrs: ["ADR-0009", "ADR-0035"],
		routes: lexeme("NOUN", "DET"),
		records: [
			"de/ich-bin-im-wald",
			"de/da-steht-ne-kiste-auf-dem-flur",
			"de/wir-brauchen-fuer-den-transport-noch-n-auto",
		],
	},
	{
		id: "de/shared-article-in-coordination",
		statement:
			"In coordinated nouns that agree, only the closest noun owns the article: der Aufstieg und Abstieg gives [der, Aufstieg] and [Abstieg], and Abstieg records der as a shared article with Partial coverage. Closest counts Segments within that noun phrase, nested phrases aside, and a tie is Unresolved. Nearness alone never licenses sharing, and another article or a clause boundary ends it.",
		adrs: ["ADR-0003", "ADR-0004", "ADR-0035"],
		routes: lexeme("NOUN"),
		records: [],
	},
	{
		id: "de/proper-noun-article",
		statement:
			"A proper noun cited with its definite article (die Schweiz, der Rhein, die NATO, der Struwwelpeter) has Core article Definite and owns that article as a common noun does, fused pieces included: im Rhein gives [i] ADP and [m, Rhein] PROPN. Names of streets, squares, rivers, mountains and buildings are cited with it, however unfamiliar the name: im Fliederweg gives [m, Fliederweg] PROPN. A title cited with its article is one of them, because the article inflects: Die Zauberflöte is Zauberflöte with Core article Definite (in der Zauberflöte). A name cited bare (Berlin, Anna) has no Core article and still owns the article that opens its phrase, as the Head: das alte Berlin gives [das, Berlin] PROPN, and im alten Berlin gives [i] ADP and [m, Berlin] PROPN.",
		adrs: ["ADR-0035", "ADR-0040"],
		routes: lexeme("PROPN"),
		records: [
			"de/am-samstag-sehen-wir-die-zauberfloete-in-der-oper",
			"de/er-badet-im-rhein",
			"de/mr-und-mrs-parker-wohnen-im-fliederweg-nummer-7",
			"de/ich-wohne-im-alten-berlin",
			"de/viele-vermissen-das-alte-berlin",
		],
	},
	{
		id: "de/title-before-a-name",
		statement:
			"A title or form of address before a name (Herr, Frau, Dr., Mr, Mrs) is a common noun of its own, and the name a separate PROPN. It takes the name's case and number, unless it addresses someone. An abbreviated title stands for its expansion, also without the dot British usage drops: Mr und Mrs Parker gives [Mr] NOUN Mister and [Mrs] NOUN Missis.",
		adrs: ["ADR-0035"],
		routes: lexeme("NOUN", "PROPN"),
		records: [
			"de/mr-und-mrs-parker-wohnen-im-fliederweg-nummer-7",
			"de/dipl-ing-mueller-leitet-das-projekt",
		],
	},
];

const fusedWords: Rule[] = [
	{
		id: "de/fused-word-pieces",
		statement:
			"A fused word is one Segment per word it holds, and each piece belongs to the unit of the word it stands for: im is i (in) and m (dem), zur is zu and r (der), geht's is geht and 's (es). Outside a fixed expression, a preposition piece is a single-member ADP and an article piece belongs to the noun its phrase opens onto: Ich bin im Wald gives [i] ADP and [m, Wald] NOUN, and in Er wartet aufs Ende, auf joins wartet and s joins Ende. Inside a fixed expression (Öl ins Feuer gießen, zur Verfügung stellen) both pieces are members. A click on a piece opens the unit that owns that piece, never the whole written word, and a fused article piece is its noun's one article: [s, Ende]. am before a superlative is no fused word: it stands for no other words, so it is one Segment and a member of the word whose degree it marks: Mina reist am liebsten gives [am, liebsten] ADV gern, and Wer steht am nächsten? gives [am, nächsten] ADJ nah. Before a noun phrase am still splits: Am nächsten Morgen gives [A] ADP an and [m, Morgen] NOUN.",
		adrs: ["ADR-0027", "ADR-0035", "ADR-0040", "dumgen/ADR-0004"],
		routes: lexeme("ADP", "NOUN", "ADJ", "ADV"),
		records: [
			"de/ich-bin-im-wald",
			"de/mina-reist-am-liebsten-im-fruehling",
			"de/wer-steht-am-naechsten",
			"de/von-allen-arbeitet-sie-am-sorgfaeltigsten",
			"de/am-naechsten-morgen-war-alles-anders",
		],
	},
	{
		id: "de/abbreviation-is-one-segment",
		statement:
			"An abbreviation (z.B., usw., Dr.) is one Segment and stands for its whole expansion: the Surface of z.B. is zum Beispiel.",
		adrs: ["ADR-0035", "dumgen/ADR-0004"],
		routes: [],
		records: [],
	},
];

const pronounsAndAdjectives: Rule[] = [
	{
		id: "de/pron-or-det-by-use",
		statement:
			"An interrogative, demonstrative, relative, quantifier or negative that stands for a noun phrase is PRON; one that directly modifies a noun is DET. Genitive jedermanns is PRON, and so are attributive dessen, deren and wessen, whose following noun is a separate target.",
		adrs: [],
		routes: lexeme("PRON", "DET"),
		records: ["de/und-minz-und-maunz-die-schreien"],
	},
	{
		id: "de/possessive-after-article",
		statement:
			"In der meine, der meinige and der eine, the pronoun stands in for an elided noun, so it is the Head of its phrase and owns the article the way a noun does: Der meine ist rot gives [Der, meine] PRON. The article is no DET target of its own.",
		adrs: ["ADR-0040"],
		routes: lexeme("PRON", "DET"),
		records: [],
	},
	{
		id: "de/was-fuer",
		statement:
			"Standalone was für einer or was für welche is one PRON target. was für ein before a noun, and plural or mass was für, is one DET target. Either may be split across the sentence; the noun and other free words stay outside.",
		adrs: ["ADR-0009"],
		routes: lexeme("PRON", "DET"),
		records: [],
	},
	{
		id: "de/adjective-stays-adj",
		statement:
			"Comparative and adverbially used adjectives are ADJ, never ADV: sie singt laut gives [laut] ADJ. A word that can inflect as an attributive adjective (lauter, langsame) is an adjective.",
		adrs: [],
		routes: lexeme("ADJ", "ADV"),
		records: [],
	},
	{
		id: "de/comparability-is-lexical",
		statement:
			"An ADV or ADJ Lemma is comparable when the dictionary gives it comparison forms, suppletive ones included: gern → lieber, am liebsten. A colloquial form such as töter does not count. Every Surface of a comparable Lemma marks Degree, Pos in a citation (mild), a predicative use (wird mild) and an adverbial use (singt laut). No Surface of a non-comparable Lemma (hier, heute, tot, entzwei) marks Degree. Such a Surface has no inflection, except that an attributive ADJ marks case, gender and number (der tote Mann).",
		adrs: ["ADR-0042"],
		routes: lexeme("ADJ", "ADV"),
		records: [
			"de/als-grundform-wird-mild-angegeben",
			"de/bitte-warten-sie-hier-vor-dem-eingang",
		],
	},
	{
		id: "de/attributive-adjective-stands-alone",
		statement:
			"An attributive adjective or participle is a single-member target. The article before it and the noun after it belong to the noun: in ein alter Mann, alter gives [alter] ADJ, and in der wartende Kunde, der belongs to [der, Kunde].",
		adrs: ["ADR-0004", "ADR-0036"],
		routes: lexeme("ADJ"),
		records: [],
	},
];

const conjunctionsAndParticles: Rule[] = [
	{
		id: "de/correlator-anchors",
		statement:
			"A fixed correlator is one Locution made of its anchors only, never the words they connect, and its Kind is the part of speech of the whole unit, not of the clicked anchor: entweder … oder, weder … noch, sowohl … als auch and nicht nur … sondern auch are CCONJ; je … desto, je … umso and je … je are SCONJ, since the je clause is verb-final, and so are um … zu, ohne … zu, statt … zu and so … dass; einerseits … andererseits and teils … teils are ADV. je … desto, je … umso (with its pre-1996 Variant je … um so) and je … je are three Lemmas, related as synonyms.",
		adrs: ["ADR-0009", "ADR-0039"],
		routes: locution("CCONJ", "SCONJ", "ADV"),
		records: [
			"de/je-hoeher-der-druck-desdo-groesser-das-risiko",
			"de/je-laenger-der-weg-wird-desto-mueder-werden-die-reisenden",
			"de/je-ruhiger-die-see-war-desto-schneller-kamen-wir-voran",
			"de/je-laenger-wir-warteten-desto-unruhiger-wurden-die-kinder",
			"de/je-frueher-desto-besser",
			"de/je-waermer-desto-schoener",
			"de/je-laenger-der-weg-desto-mueder-die-reisenden",
			"de/je-genauer-wir-messen-umso-sicherer-wird-das-ergebnis",
			"de/je-spaeter-der-abend-wurde-umso-leiser-sprach-die-runde",
			"de/je-mehr-er-versprach-je-weniger-glaubte-man-ihm",
			"de/sie-trinkt-weder-tee-noch-kaffee",
			"de/ich-gehe-tomaten-kaufen-um-einen-salat-zu-machen",
			"de/der-plan-ist-einerseits-guenstig-andererseits-riskant",
		],
	},
	{
		id: "de/bare-infinitive-zu",
		statement:
			"zu before an infinitive, without um, ohne or statt, is a single-member PART and never joins the infinitive: versucht zu schlafen gives [zu] PART and [schlafen] VERB.",
		adrs: [],
		routes: lexeme("PART"),
		records: [],
	},
];

const locutionsAndSayings: Rule[] = [
	{
		id: "de/fixed-member-test",
		statement:
			"A word is a fixed member of an expression when the expression needs this word, or one of a narrow set, in its slot: an ordinary synonym would break it. A fixed article or preposition counts through the word that carries it (ins Feuer, zur Verfügung). A preposition the expression governs for a free complement (weiß Bescheid über die Pläne) is valency, not a fixed member.",
		adrs: ["ADR-0034", "dumgen/ADR-0007"],
		routes: everyMultiword,
		records: [],
	},
	{
		id: "de/funktionsverbgefuege-are-collocations",
		statement:
			"A Collocation is a Locution VERB whose verb only supports its noun or adjective predicate: a Funktionsverbgefüge (zur Verfügung stellen, in Frage kommen, eine Entscheidung treffen, Angst haben, Bescheid wissen) or a verb with an adjective predicate (geltend machen, ernst nehmen). Its members are the verb, the noun or adjective, the noun's own article or both pieces of its fused word, and a preposition the noun or the expression governs. Free arguments and adverbs stay outside: stellt den Schülern Material zur Verfügung gives [stellt, zu, r, Verfügung]. A weak collocation whose meaning is literal (starker Raucher, Zähne putzen) and an ordinary verb with a free object (eine Cola bringen) are separate Lexemes. Collocation is the Reading's Locution Type, never part of the Lemma.",
		adrs: ["ADR-0039", "ADR-0034", "dumgen/ADR-0007"],
		routes: locution("VERB"),
		records: [
			"de/wir-stellen-die-daten-zur-verfuegung",
			"de/der-ausschuss-trifft-eine-entscheidung",
			"de/die-ausschuesse-treffen-entscheidungen",
			"de/er-weiss-bescheid-ueber-die-plaene",
		],
	},
	{
		id: "de/idiom",
		statement:
			"An established expression whose meaning here is not the sum of its words is an Idiom, a Locution whose Kind is the part of speech the whole acts as: den Faden verlieren and es in sich haben are VERB, weißer Rabe is NOUN, ganz und gar and unter vier Augen are ADV. A VERB or NOUN Idiom inflects like its verb or noun (hat den Faden verloren). The same words used literally are separate units. A click on any fixed member, a fixed article or preposition included, selects the whole Locution. Idiom is the Reading's Locution Type, never part of the Lemma.",
		adrs: ["ADR-0039", "dumgen/ADR-0007"],
		routes: everyLocution,
		records: [
			"de/mitten-in-der-erklaerung-hat-er-voellig-den-faden-verloren",
			"de/verbrannt-ist-alles-ganz-und-gar",
			"de/im-woerterbuch-steht-der-eintrag-ins-gras-beissen",
		],
	},
	{
		id: "de/routine-formula-is-intj",
		statement:
			"A routine formula, a fixed conversational routine such as a greeting, farewell, thanks, apology or wish (guten Morgen, herzlichen Dank, tut mir leid, wie geht's), is an INTJ: a Lexeme when it is one word (danke, willkommen, Entschuldigung!), a Locution otherwise. What it does in conversation is its Formula Role, Reading Knowledge: tut mir leid is one Lemma with an apology Reading and a sympathy Reading. Entschuldigung! and the noun die Entschuldigung are two Lemmas. A fixed adverbial keeps Kind ADV even as a standalone reply: auf keinen Fall (Gibst du es ihm? – Auf keinen Fall.) and wie dem auch sei are Locution ADV, never INTJ. Words that only stand together are no formula, and each resolves on its own: a merely preferred combination (starker Regen), a repeated formula (Danke, danke! gives two danke targets) and an answer before a formula (nein danke gives [nein] and [danke]).",
		adrs: ["ADR-0039"],
		routes: [...lexeme("INTJ"), ...locution("INTJ", "ADV")],
		records: [
			"de/tut-mir-leid-das-war-mein-fehler",
			"de/als-sie-vom-tod-seines-hundes-erfuhr-sagte-sie-leise-tut-mir",
			"de/obwohl-am-empfang-schon-jemand-hallo-gerufen-hatte",
			"de/nach-dem-lockeren-zuruf-hallo-trat-die-gastgeberin-ans",
			"de/gibst-du-ihm-das-original-ohne-quittung-auf-keinen-fall",
			"de/nach-dem-einwand-und-dem-zitierten-spruch-morgenstund-hat",
			"de/als-beide-kisten-endlich-oben-standen-erwiderte-der",
			"de/moechten-sie-noch-kuchen-nein-danke-ich-bin-satt",
		],
	},
	{
		id: "de/saying-needs-uptake",
		statement:
			"A Saying is a complete saying that speakers have taken up, one target over all its words: a Proverb (Morgenstund hat Gold im Mund) or a Winged Word, a line from a known source that speakers use apart from it (Sein oder Nichtsein). A line is taken up when a reference collection lists it: Büchmann's Geflügelte Worte, Duden's Zitate und Aussprüche or OWID's Sprichwörterbuch. A Reviewed record of a Saying cites that collection in its references. A maxim nobody quotes, a famous author's included, resolves word by word. The Canonical Form is written as a sentence, with internal punctuation and no final punctuation (Wer rastet, der rostet). Proverb or Winged Word is the Reading's Saying Type, never part of the Lemma.",
		adrs: ["ADR-0039"],
		routes: saying,
		records: [
			"de/morgenstund-hat-gold-im-mund-sagte-sie-verschlafen",
			"de/nach-der-winterpause-begann-die-laufgruppe-wieder-zu",
		],
	},
	{
		id: "de/modification-attests-partially",
		statement:
			"A deliberate change of wording still attests the unit, with Partial coverage: the kept words are its members, the missing ones are absent, and the replacing words resolve on their own. A Saying accepts any modification, a shortened one included: Kaffee oder Tee, das ist hier die Frage attests Sein oder Nichtsein, das ist hier die Frage over [oder, das, ist, hier, die, Frage], and Wer rastet, rostet attests Wer rastet, der rostet. A Locution accepts only a fixed word expanded into a compound that the fixed word heads: Er biss ins Kunstgras attests ins Gras beißen over [biss, in, s], Kunstgras is a NOUN of its own, and the fused article stays with the Locution. Any other replacement breaks the Locution, and its words resolve on their own (in den Rasen beißen).",
		adrs: ["ADR-0039", "ADR-0003"],
		routes: everyMultiword,
		records: [],
	},
];

/** What an Attestation of a unit records: its Lemma, Surface and members. */
const attestations: Rule[] = [
	{
		id: "de/core-features-are-identity",
		statement:
			"A Lemma's Core Features belong to its dictionary identity; features of one occurrence belong to its Surface. Each route chooses its Core Features for the learner: a pillar such as the der table or the personal pronouns has one Lemma per cell, and a stem word such as dieser or mein is one Lemma whose forms are Surfaces.",
		adrs: ["ADR-0002", "ADR-0018", "ADR-0032"],
		routes: [],
		records: [],
	},
	{
		id: "de/canonical-form-is-the-headword",
		statement:
			"A Lemma's Canonical Form is its exact dictionary headword, casing included, and may differ from the words in the sentence. It takes the word's lexical casing, never its place in the sentence: sentence-initial Wegen is wegen, and a noun keeps its capital. A noun's is the bare noun, without its article. An open slot in a discontinuous form is written … (U+2026) with a space on each side (um … willen, je … desto), never ASCII .... An adjective used only attributively cites the dictionary's adjective headword, never an adverb of the same stem: die linke Hand gives ADJ linke (Duden: linke, linker, linkes), not ADV links, and so do rechte, obere and innere. An adjectival noun for a person is one Lemma cited in its weak form after the definite article, with gender null, because its gender is the referent's sex: der Angestellte, die Angestellte, ein Angestellter and zwei Angestellte all give Angestellte, and ein Verletzter gives Verletzte. A neuter with a meaning of its own is a separate Lemma with gender Neut: ins Deutsche übersetzen gives Deutsche. A Surface spelled Canonical need not be the Grundform: a finite or declined form can be Canonical.",
		adrs: ["ADR-0002", "ADR-0035"],
		routes: [],
		records: [
			"de/die-linke-hand-zitterte",
			"de/die-angestellten-streikten-gestern",
			"de/wir-danken-den-angestellten-fuer-ihre-hilfe",
			"de/die-reisenden-steigen-am-bahnhof-aus",
			"de/auf-dem-bahnsteig-warten-dreizehn-reisende",
			"de/der-reisende-wartete-draussen",
			"de/der-reisende-haendler-wartete-draussen",
			"de/ein-verletzter-lag-am-strassenrand",
			"de/sie-uebersetzt-den-vertrag-ins-deutsche",
		],
	},
	{
		id: "de/member-orthography",
		statement:
			"Each member records how it is written. Standard covers licensed variants and sentence-initial capitals; Typo is a real spelling or casing error; Fused is one piece of a written word that holds several words (m in im, 's in geht's); Shorthand is a standalone shortened word ('ne, z.B.). Members stay aligned with the sentence: none is added, dropped or modernized.",
		adrs: ["ADR-0003", "ADR-0035"],
		routes: [],
		records: [],
	},
	{
		id: "de/variant-and-historical-status",
		statement:
			"A Surface is spelled Variant only when it uses a licensed spelling of the same Lemma, never for an inflected form or a repaired typo. Historical status marks archaic grammar, not old spelling or an old text around it.",
		adrs: [],
		routes: [],
		records: [],
	},
	{
		id: "de/empty-inflection-is-structural",
		statement:
			"A Surface leaves its inflection empty only for a dictionary citation, or for an invariant use its route leaves unmarked. An empty inflection states that structure; it never stands for uncertainty.",
		adrs: ["ADR-0032"],
		routes: [],
		records: [],
	},
	{
		id: "de/suspended-compound-completion",
		statement:
			"A fragment with a trailing hyphen is completed only in a two-part und or oder coordination with a full compound that shares its literal ending: in Ein- und Ausgang, Ein- is completed to Eingang, with Full coverage.",
		adrs: ["ADR-0004"],
		routes: lexeme("NOUN"),
		records: [],
	},
	{
		id: "de/verbal-surface-is-whole",
		statement:
			"A verbal Surface describes its whole target. Perfect, future and passive belong to the whole verbal unit and stay empty on an auxiliary's own Surface, and tense describes the finite verb only.",
		adrs: ["ADR-0022", "ADR-0026"],
		routes: lexeme("VERB", "AUX"),
		records: ["de/der-faehrmann-hat-uns-uebergesetzt"],
	},
	{
		id: "de/verb-core-features",
		statement:
			"A VERB's hasSepPrefix names only its separable prefix, never a governed preposition or a preposition with its own complement. verbType Mod marks a modal, one Lemma whether it governs an infinitive or an object.",
		adrs: ["ADR-0026", "ADR-0029"],
		routes: lexeme("VERB"),
		records: [
			"de/der-faehrmann-hat-uns-uebergesetzt",
			"de/er-muss-heute-arbeiten",
		],
	},
	{
		id: "de/partial-coverage",
		statement:
			"An Attestation is Partial only when fixed material is really missing from the sentence and the whole identity is still clear: a noun sharing another noun's article, or a Locution or Saying with a fixed word left out or deliberately changed (Rule de/modification-attests-partially). A split target, or one with free words between its members, is still Full.",
		adrs: ["ADR-0003", "ADR-0004", "ADR-0039"],
		routes: [...lexeme("NOUN"), ...everyMultiword],
		records: [],
	},
];

/**
 * The German classification Rules (ADR 0037), grouped by topic. A Rule with
 * no routes applies to every German route. A Rule with no records still needs
 * a Spec Record that shows it.
 */
export const germanRules: readonly Rule[] = [
	...units,
	...verbs,
	...participles,
	...nouns,
	...fusedWords,
	...pronounsAndAdjectives,
	...conjunctionsAndParticles,
	...locutionsAndSayings,
	...attestations,
];
