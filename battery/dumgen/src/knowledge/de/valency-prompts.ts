/**
 * The valency prompt's answer shape: the paragraphs that say how Luna writes
 * one concrete Valency Pattern in case letters (`valency-notation.ts`), after
 * the linguistic paragraphs in `prompts.ts`, and the worked examples.
 *
 * No example is a Lemma of the Knowledge gold or the spot-check samples
 * (#693); `valencyExampleLemmas` names the examples line's Lemmas for the
 * disjointness test, since the line quotes none «…».
 */
import type { CitingPrompt } from "dumcorpus/types";
import { type Cite, paragraphRegistry } from "../../prompt-paragraphs.js";

const valencyRule: Cite = [
	"de/valency-frame-follows-e-valbu",
	"bb0916c5f324dcf2",
];
const collocationRule: Cite = [
	"de/funktionsverbgefuege-are-collocations",
	"57f04b272a0e9aeb",
];
const idiomRule: Cite = ["de/idiom", "d25679f2a06809b9"];

const registry = paragraphRegistry("de/knowledge");
const paragraph = (name: string, text: string, ...cites: Cite[]) =>
	registry.paragraph(`valency.notation.${name}`, text, valencyRule, ...cites);

/** What each part of the concrete pattern is written as, in the order the prompt says them. */
export const notationParagraphs = [
	paragraph(
		"shape",
		"Write one concrete Valency Pattern in German dictionary notation: only the governed complements realized in `markedSentence`, separated by single spaces, with no parentheses and no | alternatives.",
	),
	paragraph(
		"case",
		"A Case complement is the letter of its case, whoever or whatever fills it: N (Nom), A (Acc), D (Dat), G (Gen).",
	),
	paragraph(
		"preposition",
		"A Preposition complement is the preposition and the letter of the case it governs there: auf A, mit D; after a two-way preposition (an, auf, hinter, in, neben, über, unter, vor, zwischen) it names which case: an A, an D. A governed über or auf takes Acc (über A) and a governed vor or zwischen Dat (vor D); a governed an or in takes the case the dictionary gives this meaning («denken an»: an A; «leiden an»: an D).",
	),
	paragraph(
		"reflexive",
		"A Reflexive complement is sich(A) or sich(D); inside a fixed phrase it follows the phrase's preposition: außer sich(D). Without 🪞 at the start of the Emoji Description, a sich this sentence shows as an ordinary object is A or D («sie kämmt sich»: N A).",
	),
	paragraph(
		"clause",
		"A Clause is dass, ob, w (an indirect w-question), zu+Inf or Inf (a bare infinitive). When a da(r)- pronominal adverb anticipates the clause («darauf achten, dass …», «darauf hoffen, …»), prefix the clause with that preposition: auf dass, auf zu+Inf.",
	),
	paragraph(
		"adverbial",
		"An Adverbial is its stand-in: irgendwo (a place), irgendwohin (a direction), irgendwie (a manner), irgendwie lange (a duration), irgendwie viel (an amount).",
	),
	paragraph(
		"predicative",
		"A Predicative is ADJ, als ADJ or für ADJ, ADJ standing for any predicative adjective or noun; it describes the Acc object when the pattern has one, else the subject. Write one only when the sentence realizes a governed predicative.",
	),
	paragraph(
		"subject",
		"A verb's pattern starts with its subject, N; a verb whose subject is only an expletive es starts with es instead (es D irgendwie). Write - when no governed complement is realized.",
	),
	paragraph(
		"collocation",
		"A Collocation of a verb and a noun («Kritik üben», «Hilfe leisten») includes only the complements actually realized in `markedSentence` beyond its fixed noun («sie übt Kritik an dem Plan»: N an D; «sie übt Kritik»: N). An Idiom's pattern holds only the free complements realized beyond its own words («sie kam mit ihm ins Gespräch»: N mit D; «er dreht Däumchen»: N).",
		collocationRule,
		idiomRule,
	),
	paragraph(
		"output",
		"Use only the complement kinds `complementKinds` names. Answer with the concrete pattern alone: only the notation's letters, prepositions, markers and stand-ins, never the Lemma, its fixed words, its separable prefix, parentheses, | or any other word.",
	),
];

/** Each example's Lemma, its Emoji Description, whether it is a verb, and one concrete pattern Luna answers. */
export const valencyExamples = [
	{
		lemma: "ahnen",
		emoji: "🤔",
		verb: true,
		pattern: "N dass",
	},
	{
		lemma: "freuen",
		emoji: "🪞😊",
		verb: true,
		pattern: "N sich(A) auf A",
	},
	{
		lemma: "freuen",
		emoji: "🪞😊",
		verb: true,
		pattern: "N sich(A) auf zu+Inf",
	},
	{ lemma: "halten", emoji: "🤔⚖", verb: true, pattern: "N A für ADJ" },
	{ lemma: "fehlen", emoji: "🕳", verb: true, pattern: "es D an D" },
	{ lemma: "dauern", emoji: "⏳", verb: true, pattern: "N irgendwie lange" },
	{ lemma: "neidisch", emoji: "😒", verb: false, pattern: "auf A" },
	{ lemma: "Fenster", emoji: "🪟", verb: false, pattern: "-" },
	{ lemma: "den Braten riechen", emoji: "👃🕵", verb: true, pattern: "N" },
	{
		lemma: "einen Bären aufbinden",
		emoji: "🐻🤥",
		verb: true,
		pattern: "N D",
	},
] as const;

/** The examples as one line, each Reading then a concrete pattern. */
export const examplesParagraph = registry.paragraph(
	"valency.examples",
	`Examples: ${valencyExamples
		.map(({ lemma, emoji, pattern }) => `${lemma} ${emoji}: ${pattern}`)
		.join("; ")}.`,
	valencyRule,
);

/** The examples' Lemmas, for the disjointness test (#693). */
export const valencyExampleLemmas: readonly string[] = valencyExamples.map(
	({ lemma }) => lemma,
);

/** The «…» examples the notation paragraphs quote, for the disjointness test (#693). */
export const valencyNotationExamples = (): readonly string[] =>
	registry.examples();

/** The registered paragraphs, as dumcorpus's citation check reads them. */
export function valencyPromptTexts(): readonly CitingPrompt[] {
	return registry.texts();
}
