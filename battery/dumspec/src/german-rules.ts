import type { Rule, RuleRoute } from "./types.js";

const lexeme = (...kinds: RuleRoute["kind"][]): RuleRoute[] =>
	kinds.map((kind) => ({ language: "de", family: "Lexeme", kind }));
const phraseme = (...kinds: RuleRoute["kind"][]): RuleRoute[] =>
	kinds.map((kind) => ({ language: "de", family: "Phraseme", kind }));
const everyPhraseme = phraseme(
	"Idiom",
	"Collocation",
	"DiscourseFormula",
	"Proverb",
	"Aphorism",
);

/** Which Segments form one unit, whatever its route. */
const units: Rule[] = [
	{
		id: "de/largest-fixed-unit",
		statement:
			"A click on a word selects the largest complete fixed unit that contains it. Every fixed member selects the same unit, and the unit is found by position in the sentence, never by spelling.",
		adrs: ["ADR-0004", "ADR-0009", "dumgen/ADR-0006"],
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
		id: "de/phrasemes-are-made-of-lexemes",
		statement:
			"Every word belongs to exactly one Lexeme target, and most Lexeme targets have one member. A Phraseme is made of whole Lexeme targets, so a word inside an idiom or a collocation keeps its own Lexeme target, and the Phraseme leads to it.",
		adrs: ["dumgen/ADR-0006"],
		routes: everyPhraseme,
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
			...phraseme("Collocation", "Idiom"),
		],
		records: ["de/pass-auf-dich-auf"],
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
		records: [],
	},
	{
		id: "de/auxiliary-joins-the-verb-it-serves",
		statement:
			"sein, haben or werden marking perfect, future or passive is never a target on its own. It joins the verb it serves as that unit's auxiliary, and a click on it selects that verb. Standing alone, the same verbs are VERBs with their own meaning: copular sein, haben 'to own', werden 'to become'.",
		adrs: ["ADR-0026", "ADR-0022"],
		routes: lexeme("VERB", "AUX"),
		records: [],
	},
	{
		id: "de/copula-stays-apart",
		statement:
			"A copula (sein, werden, bleiben, scheinen, wirken, sich zeigen) never joins its predicate: in Das Wetter ist schön, ist is a single-member VERB and schön an ADJ of its own. A copula and a predicative adjective never form a Collocation, so Er ist stolz auf seinen Sohn gives [ist] VERB and [stolz, auf] ADJ.",
		adrs: ["ADR-0026", "ADR-0034", "ADR-0036"],
		routes: [...lexeme("VERB", "ADJ"), ...phraseme("Collocation")],
		records: ["de/das-wetter-ist-xqzt"],
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
			"A participle outside a perfect or passive is a single-member ADJ: attributive (die gebratenen Zwiebeln), adverbial (ging pfeifend davon) or predicative (wirkte erschöpft). Lexicalized participles such as überzeugend and gelassen are ADJ too. The participle's own objects, adverbs, agents and prepositional phrases are free words: in der von allen gelobte Koch, only gelobte is the target. A substantivized participle is a NOUN.",
		adrs: ["ADR-0036"],
		routes: lexeme("ADJ", "NOUN"),
		records: [],
	},
];

const nouns: Rule[] = [
	{
		id: "de/noun-owns-its-article",
		statement:
			"A common noun owns the article that opens its own noun phrase, even across adjectives: der steile Aufstieg gives [der, Aufstieg] NOUN and [steile] ADJ. A click on the article selects the noun. An article cut off from the noun by a verb, a clause boundary or another noun is not its article: in Der Weg ist das Ziel, Weg gives [Der, Weg]. A bare noun stays bare.",
		adrs: ["ADR-0004", "ADR-0009", "ADR-0035"],
		routes: lexeme("NOUN"),
		records: [
			"de/das-wetter-ist-xqzt",
			"de/es-zog-der-wilde-jaegersmann",
			"de/ich-bin-im-wald",
		],
	},
	{
		id: "de/only-der-and-ein-are-articles",
		statement:
			"Only forms of der, die, das and ein are articles, including the article piece of a fused word (m in im) and a shortened article ('ne, 'nen). mein, dieser, kein and other determiners are DETs of their own: kein Haus gives [kein] DET and [Haus] NOUN.",
		adrs: ["ADR-0009", "ADR-0035"],
		routes: lexeme("NOUN", "DET"),
		records: ["de/ich-bin-im-wald"],
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
			"A proper noun cited with its definite article (die Schweiz, der Rhein, die NATO, der Struwwelpeter) owns that article as a common noun does, fused pieces included: im Rhein gives [i] ADP and [m, Rhein] PROPN. A name cited bare (Berlin, Anna) owns none: in das alte Berlin, das is a DET of its own.",
		adrs: ["ADR-0035"],
		routes: lexeme("PROPN", "DET"),
		records: [],
	},
];

const fusedWords: Rule[] = [
	{
		id: "de/fused-word-pieces",
		statement:
			"A fused word is one Segment per word it holds, and each piece belongs to the unit of the word it stands for: im is i (in) and m (dem), zur is zu and r (der), geht's is geht and 's (es). Outside a fixed expression, a preposition piece is a single-member ADP and an article piece belongs to the noun its phrase opens onto: Ich bin im Wald gives [i] ADP and [m, Wald] NOUN, and in Er wartet aufs Ende, auf joins wartet and s joins Ende. Inside a fixed expression (Öl ins Feuer gießen, zur Verfügung stellen) both pieces are members.",
		adrs: ["ADR-0027", "ADR-0035", "dumgen/ADR-0004"],
		routes: lexeme("ADP", "NOUN"),
		records: ["de/ich-bin-im-wald"],
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
		records: [],
	},
	{
		id: "de/possessive-after-article",
		statement:
			"In der meine and der meinige, the article is a separate DET and meine or meinige a PRON. The article does not join them the way it joins a noun.",
		adrs: [],
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
			"A fixed correlator is one target made of its anchors only, never the words they connect, and it takes the part of speech of the whole unit, not of the clicked anchor: entweder/oder, weder/noch, sowohl/als/auch, nicht nur/sondern auch and je/desto are CCONJ; um/zu, ohne/zu, statt/zu and so/dass are SCONJ; einerseits/andererseits and teils/teils are ADV.",
		adrs: ["ADR-0009"],
		routes: lexeme("CCONJ", "SCONJ", "ADV"),
		records: [],
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

const phrasemes: Rule[] = [
	{
		id: "de/fixed-member-test",
		statement:
			"A word is a fixed member of an expression when the expression needs this word, or one of a narrow set, in its slot: an ordinary synonym would break it. A fixed article or preposition counts through the word that carries it (ins Feuer, zur Verfügung). A preposition the expression governs for a free complement (weiß Bescheid über die Pläne) is valency, not a fixed member.",
		adrs: ["ADR-0034", "dumgen/ADR-0006"],
		routes: everyPhraseme,
		records: [],
	},
	{
		id: "de/funktionsverbgefuege-are-collocations",
		statement:
			"A Funktionsverbgefüge, a support verb with its predicate noun (zur Verfügung stellen, in Frage kommen, eine Entscheidung treffen, Angst haben, Bescheid wissen), is one Collocation. Its members are the verb, the noun, the noun's own article or both pieces of its fused word, and a preposition the noun or the expression governs. Free arguments and adverbs stay outside: stellt den Schülern Material zur Verfügung gives [stellt, zu, r, Verfügung]. An ordinary verb with a free object (eine Cola bringen) is not a Collocation.",
		adrs: ["ADR-0028", "ADR-0034", "dumgen/ADR-0006"],
		routes: phraseme("Collocation"),
		records: [],
	},
	{
		id: "de/idiom",
		statement:
			"An established expression whose meaning here is not the sum of its words is an Idiom, with or without a noun (den Faden verlieren, das Eis brechen, es in sich haben). The same words used literally are separate units. A click on any fixed member, a fixed article or preposition included, selects the whole Idiom.",
		adrs: ["dumgen/ADR-0006"],
		routes: phraseme("Idiom"),
		records: [],
	},
	{
		id: "de/formulas-proverbs-aphorisms",
		statement:
			"A discourse formula is a fixed conversational routine (Guten Morgen, Herzlichen Dank, Wie geht's). A proverb is a traditional complete saying (Morgenstund hat Gold im Mund), and an aphorism an established maxim with a known author (Zeit ist Geld). A merely preferred combination (starker Regen) has no expression of its own, and its words stay separate units.",
		adrs: ["dumgen/ADR-0006"],
		routes: phraseme("DiscourseFormula", "Proverb", "Aphorism"),
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
			"A Lemma's Canonical Form is its exact dictionary headword, casing included, and may differ from the words in the sentence. A noun's is the bare noun, without its article. A Surface spelled Canonical need not be the Grundform: a finite or declined form can be Canonical.",
		adrs: ["ADR-0002", "ADR-0035"],
		routes: [],
		records: [],
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
		id: "de/noun-article-feature",
		statement:
			"A noun's Surface records the article it owns or shares as article: Definite, Indefinite, or None for a bare noun or a noun with a non-article determiner. A noun in a sentence always marks case and number, even with article None.",
		adrs: ["ADR-0035"],
		routes: lexeme("NOUN"),
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
		records: [],
	},
	{
		id: "de/verb-core-features",
		statement:
			"A VERB's hasSepPrefix names only its separable prefix, never a governed preposition or a preposition with its own complement. verbType Mod marks a modal, one Lemma whether it governs an infinitive or an object.",
		adrs: ["ADR-0026", "ADR-0029"],
		routes: lexeme("VERB"),
		records: [],
	},
	{
		id: "de/partial-coverage",
		statement:
			"An Attestation is Partial only when fixed material is really missing from the sentence and the whole identity is still clear: a noun sharing another noun's article, or an Idiom, discourse formula, proverb or aphorism with a fixed word left out. A split target, or one with free words between its members, is still Full.",
		adrs: ["ADR-0003", "ADR-0004"],
		routes: [
			...lexeme("NOUN"),
			...phraseme("Idiom", "DiscourseFormula", "Proverb", "Aphorism"),
		],
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
	...phrasemes,
	...attestations,
];
