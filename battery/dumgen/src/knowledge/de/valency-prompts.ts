/**
 * The valency prompt's answer shape: the paragraphs that say how Luna
 * writes the frame in case letters (`valency-notation.ts`), after the
 * linguistic paragraphs in `prompts.ts`, two rules whose examples are
 * frames in the notation, and the worked examples, each a Reading and its
 * frame as Luna answers it. Two of them are Locutions whose fixed noun is
 * no object («den Braten riechen», «einen Bären aufbinden»), the commonest
 * miss without them.
 *
 * They are the valency notation bench's `letters@r4` paragraphs and
 * examples (`lab/evaluation/valency-notation/`, its git history): with the
 * referent gone, a noun phrase named by its case letter alone, as the
 * learner's valency line shows it, matched gold on 74.7% of 193 dev
 * Readings over 8 reps and 63.6% of 54 held-out ones over 3 (2026-11-19),
 * against 71.8% and 64.2% for the Duden-style notation it replaces with
 * referents ignored, in 13 output tokens instead of 16.
 *
 * No example is a Lemma of the Knowledge gold or the spot-check samples
 * (#693); `valencyExampleLemmas` names the examples line's Lemmas for the
 * disjointness test, since the line quotes none «…».
 */
import type { CitingPrompt } from "dumcorpus/types";
import { type Cite, paragraphRegistry } from "../../prompt-paragraphs.js";

const valencyRule: Cite = [
	"de/valency-frame-follows-e-valbu",
	"b0e43da9d292b84d",
];
const collocationRule: Cite = [
	"de/funktionsverbgefuege-are-collocations",
	"57f04b272a0e9aeb",
];
const idiomRule: Cite = ["de/idiom", "d25679f2a06809b9"];

const registry = paragraphRegistry("de/knowledge");
const paragraph = (name: string, text: string, ...cites: Cite[]) =>
	registry.paragraph(`valency.notation.${name}`, text, valencyRule, ...cites);

/** What each part of the frame is written as, and the rules stated in it, in the order the prompt says them. */
export const notationParagraphs = [
	paragraph(
		"shape",
		"Write the frame in German dictionary notation, as E-VALBU and Duden write a pattern: the Slots in frame order separated by single spaces, an Optional Slot in parentheses, a Required one bare, and the alternatives of one Slot joined by | with no spaces around it.",
	),
	paragraph(
		"case",
		"A Case complement is the letter of its case, whoever or whatever fills it: N (Nom), A (Acc), D (Dat), G (Gen).",
	),
	paragraph(
		"preposition",
		"A Preposition complement is the preposition and the letter of the case it governs there: auf A, mit D, wegen G; after a two-way preposition (an, auf, hinter, in, neben, über, unter, vor, zwischen) it names which case: an A, an D. A governed über or auf takes Acc (über A) and a governed vor or zwischen Dat (vor D); a governed an or in takes the case the dictionary gives this meaning («denken an»: an A; «leiden an»: an D).",
	),
	paragraph(
		"reflexive",
		"A Reflexive complement is sich(A) or sich(D); inside a fixed phrase it follows the phrase's preposition: außer sich(D). Without 🪞 at the start of the Emoji Description, never write a Required sich(A) or sich(D): a sich this sentence shows is then the ordinary object, A or D («sie kämmt sich»: N A).",
	),
	paragraph(
		"clause",
		"A Clause is dass, ob, w (an indirect w-question), zu+Inf or Inf (a bare infinitive). es before it marks a Required correlate and (es) an Optional one, whatever word the correlate is (es, or the da- word of the Slot's preposition): (auf A|(es) dass).",
	),
	paragraph(
		"adverbial",
		"An Adverbial is its stand-in: irgendwo (a place), irgendwohin (a direction), irgendwie (a manner), irgendwie lange (a duration), irgendwie viel (an amount).",
	),
	paragraph(
		"predicative",
		"A Predicative is ADJ, als ADJ or für ADJ, ADJ standing for any predicative adjective or noun; it describes the Acc object when the frame has one, else the subject. Write one only when the dictionary's pattern for this meaning names a predicative.",
	),
	paragraph(
		"subject",
		"A verb's frame starts with its subject Slot, N; a verb whose subject is only an expletive es starts with es instead (es D irgendwie). Write - when the Reading governs nothing.",
	),
	paragraph(
		"optionalPreposition",
		"Most prepositional Slots are Optional: one is Required only when the word without it is ungrammatical or means something else («bestehen aus», «sich kümmern um»). A Locution's prepositional Slot is almost always Optional («Kritik üben»: N (an D)).",
	),
	paragraph(
		"collocation",
		"A Collocation of a verb and a noun («Kritik üben», «Hilfe leisten») takes every complement its noun takes, each as an Optional Slot: the noun's preposition («die Kritik an etwas»: (an D)) and the person it is for («jemandem Hilfe leisten»: (D)). An Idiom's frame holds each jemand, jemandem or etwas its dictionary entry names beyond its own words, Optional when the idiom is complete without it («mit jemandem ins Gespräch kommen»: N (mit D)), and nothing the entry does not name.",
		collocationRule,
		idiomRule,
	),
	paragraph(
		"output",
		"Use only the complement kinds `complementKinds` names. Answer with the frame alone: only the notation's letters, prepositions, markers and stand-ins, never the Lemma, its fixed words, its separable prefix, a kind's name or any other word.",
	),
];

/** Each example's Lemma, its Emoji Description, whether it is a verb, and the frame Luna answers. */
export const valencyExamples = [
	{
		lemma: "ahnen",
		emoji: "🤔",
		verb: true,
		frame: "N (A|(es) dass|(es) ob|(es) w)",
	},
	{
		lemma: "freuen",
		emoji: "🪞😊",
		verb: true,
		frame: "N sich(A) (auf A|über A|(es) dass|(es) zu+Inf)",
	},
	{ lemma: "halten", emoji: "🤔⚖", verb: true, frame: "N A für ADJ" },
	{ lemma: "fehlen", emoji: "🕳", verb: true, frame: "es D an D" },
	{ lemma: "dauern", emoji: "⏳", verb: true, frame: "N irgendwie lange" },
	{ lemma: "neidisch", emoji: "😒", verb: false, frame: "(auf A)" },
	{ lemma: "Fenster", emoji: "🪟", verb: false, frame: "-" },
	{ lemma: "den Braten riechen", emoji: "👃🕵", verb: true, frame: "N" },
	{
		lemma: "einen Bären aufbinden",
		emoji: "🐻🤥",
		verb: true,
		frame: "N D",
	},
] as const;

/** The examples as one line, each Reading then its frame. */
export const examplesParagraph = registry.paragraph(
	"valency.examples",
	`Examples: ${valencyExamples
		.map(({ lemma, emoji, frame }) => `${lemma} ${emoji}: ${frame}`)
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
