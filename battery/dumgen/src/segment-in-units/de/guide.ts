/**
 * What the judge reads about units, condensed from the dumspec German Rules
 * (`de/largest-fixed-unit` onward). The wording is the lab's own; the Rules
 * stay the authority. `unitGuide` is the short form most arms put in state;
 * `ruleStatements` is every Rule statement verbatim, for the state-size
 * limit test.
 */
import { rules } from "dumspec";

export const unitGuide = {
	task: "Every word of the sentence belongs to exactly one unit: the biggest unit a click on it should open. Most units are one word.",
	lexeme_units: [
		"A noun or name owns the article der/die/das/ein that opens its phrase, across adjectives and numerals: der steile Aufstieg is [der, Aufstieg] and [steile]. The article part of a fused word belongs to the noun too: im Wald is [i] and [m, Wald]. If the noun is elided, the word standing in for it owns the article ([den, roten]). mein, dieser, kein and other determiners are units of their own.",
		"A verb owns its separable particle (zog … an), an inherently reflexive pronoun (sich schämen, erinnert sich), the auxiliaries sein/haben/werden of its perfect, future or passive (hat … gegessen, ist … worden, wird … gebaut), a non-referential es it selects (es gibt, es regnet, geht's), and a preposition it governs (wartet auf, erinnert sich an), wherever they stand.",
		"An adjective or noun owns a preposition it governs: stolz auf, Angst vor. A free preposition (im Keller, mit dem Bus) is a unit of its own.",
		"A split adverb is one unit: Da … von is davon, Wo … hin is wohin. A pronominal adverb written as one word (darauf, davon) is its own unit and never joins a verb.",
		"Stay apart: a modal verb and its infinitive, a copula (sein, werden, bleiben) and its predicate, zu before an infinitive, nicht, attributive adjectives, a participle describing a state (Die Tür ist geschlossen), pronouns, conjunctions, adverbs.",
	],
	multiword_units: [
		"Idioms and collocations acting as one word: den Faden verlieren, ins Gras beißen, zur Verfügung stellen, Angst haben, in Frage kommen. Members are the fixed words with their fixed articles and prepositions; free objects and adverbs stay out.",
		"Fixed adverbials and connectives: zum Teil, auf keinen Fall, so oder so, ganz und gar, entweder … oder, nicht nur … sondern auch, um … zu, je … desto.",
		"Routine formulas: guten Morgen, tut mir leid, gern geschehen, Darf ich bitten.",
		"A complete proverb or famous quotation used as a saying is one unit over all its words: Morgenstund hat Gold im Mund.",
		"Words that merely stand together or often co-occur are not fixed: ein Buch kaufen, starker Regen.",
	],
};

/**
 * Worked examples for the `demos` guide level, written from the Rule
 * statements' own examples, not taken from Spec Records.
 */
export const demonstrations: readonly {
	sentence: string;
	units: readonly string[];
}[] = [
	{
		sentence: "Er zog seinen Mantel an.",
		units: [
			"[Er] Lexeme/PRON",
			"[zog, an] Lexeme/VERB",
			"[seinen] Lexeme/DET",
			"[Mantel] Lexeme/NOUN",
		],
	},
	{
		sentence: "Ich bin im Wald.",
		units: [
			"[Ich] Lexeme/PRON",
			"[bin] Lexeme/VERB",
			"[i] Lexeme/ADP (in)",
			"[m, Wald] Lexeme/NOUN (m = dem)",
		],
	},
	{
		sentence: "Sie hat den Faden verloren.",
		units: [
			"[Sie] Lexeme/PRON",
			"[hat, den, Faden, verloren] Locution/VERB",
		],
	},
	{
		sentence: "Er ist stolz auf seinen Sohn.",
		units: [
			"[Er] Lexeme/PRON",
			"[ist] Lexeme/VERB",
			"[stolz, auf] Lexeme/ADJ",
			"[seinen] Lexeme/DET",
			"[Sohn] Lexeme/NOUN",
		],
	},
	{
		sentence: "Die Tür ist geschlossen, und sie singt laut.",
		units: [
			"[Die, Tür] Lexeme/NOUN",
			"[ist] Lexeme/VERB",
			"[geschlossen] Lexeme/ADJ",
			"[und] Lexeme/CCONJ",
			"[sie] Lexeme/PRON",
			"[singt] Lexeme/VERB",
			"[laut] Lexeme/ADJ",
		],
	},
	{
		sentence: "Morgenstund hat Gold im Mund, sagte sie.",
		units: [
			"[Morgenstund, hat, Gold, i, m, Mund] Saying/Saying",
			"[sagte] Lexeme/VERB",
			"[sie] Lexeme/PRON",
		],
	},
	{
		sentence: "Er wartet darauf, dass es regnet.",
		units: [
			"[Er] Lexeme/PRON",
			"[wartet] Lexeme/VERB",
			"[darauf] Lexeme/ADV",
			"[dass] Lexeme/SCONJ",
			"[es, regnet] Lexeme/VERB",
		],
	},
	{
		sentence: "Da weiß ich nichts von.",
		units: [
			"[Da, von] Lexeme/ADV",
			"[weiß] Lexeme/VERB",
			"[ich] Lexeme/PRON",
			"[nichts] Lexeme/PRON",
		],
	},
	{
		sentence: "Das ist nicht mein Problem, sie stellt eine Frage.",
		units: [
			"[Das] Lexeme/PRON",
			"[ist] Lexeme/VERB",
			"[nicht] Lexeme/PART",
			"[mein] Lexeme/DET",
			"[Problem] Lexeme/NOUN",
			"[sie] Lexeme/PRON",
			"[stellt, eine, Frage] Locution/VERB",
		],
	},
	{
		sentence: "Er versucht zu schlafen, um morgen fit zu sein.",
		units: [
			"[Er] Lexeme/PRON",
			"[versucht] Lexeme/VERB",
			"[zu] Lexeme/PART",
			"[schlafen] Lexeme/VERB",
			"[um, zu] Locution/SCONJ",
			"[morgen] Lexeme/ADV",
			"[fit] Lexeme/ADJ",
			"[sein] Lexeme/VERB",
		],
	},
];

/** Every German Rule statement, keyed by id: the heavy state variant. */
export function ruleStatements(): Record<string, string> {
	return Object.fromEntries(
		rules
			.filter((rule) => rule.id.startsWith("de/"))
			.map((rule) => [rule.id, rule.statement]),
	);
}

/** Records the Rules name as their examples, for the contamination split. */
export function ruleExampleRecords(): ReadonlySet<string> {
	return new Set(
		rules
			.filter((rule) => rule.id.startsWith("de/"))
			.flatMap((rule) => rule.records),
	);
}
