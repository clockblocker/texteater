/**
 * The valency prompt's answer shape: the paragraphs that say how Luna
 * writes the frame in the German dictionary notation
 * (`valency-notation.ts`), after the linguistic paragraphs in
 * `prompts.ts`, and its worked examples, each a Reading and its frame as
 * Luna answers it. Two of them are Locutions whose fixed noun is no object
 * («den Braten riechen», «einen Bären aufbinden»), the commonest miss
 * without them.
 *
 * They are the valency notation bench's r2 paragraphs and examples
 * (`lab/evaluation/valency-notation/`), which under the strict schema's
 * pattern matched gold on 64.0% of 193 dev Readings and 58.3% of 54
 * held-out ones (2026-11-19, 2 reps), against 54.7% and 52.8% for the JSON
 * answer they replace. r2's predicative paragraph holds the JSON prompt's
 * predicative restraint; r3's Either restraint scored no better under the
 * pattern (62.2%), so it is not here.
 *
 * No example is a Lemma of the Knowledge gold or the spot-check samples
 * (#693); `valencyExampleLemmas` names them for the disjointness test,
 * since the line quotes none «…».
 */
import type { CitingPrompt } from "dumcorpus/types";
import { type Cite, paragraphRegistry } from "../../prompt-paragraphs.js";

const valencyRule: Cite = [
	"de/valency-frame-follows-e-valbu",
	"f0b9c8226ff45fb8",
];

const registry = paragraphRegistry("de/knowledge");
const paragraph = (name: string, text: string) =>
	registry.paragraph(`valency.notation.${name}`, text, valencyRule);

/** What each part of the frame is written as, in the order the prompt says it. */
export const notationParagraphs = [
	paragraph(
		"shape",
		"Write the frame in German dictionary notation, as Duden and E-VALBU write a pattern: the Slots in frame order separated by single spaces, an Optional Slot in parentheses, a Required one bare, and the alternatives of one Slot joined by | with no spaces around it.",
	),
	paragraph(
		"case",
		"A Case complement is the dictionary pronoun, whose form names case and referent: jmd. (Nom), jmdn. (Acc), jmdm. (Dat), jmds. (Gen) for Someone; etw. for Something; jmd./etw., jmdn./etw., jmdm./etw., jmds./etw. for Either. A bare etw. is Nom in a verb's subject Slot and Acc everywhere else; write etw.(dat) or etw.(gen) for those cases. The form is the case: never add a case name after a pronoun.",
	),
	paragraph(
		"preposition",
		"A Preposition complement is the preposition and its pronoun, the pronoun's form naming the case: auf jmdn., mit jmdm./etw., nach etw. After a two-way preposition (an, auf, in, über, unter, vor, zwischen) a bare etw. names its case: auf etw.(akk), an etw.(dat).",
	),
	paragraph(
		"reflexive",
		"A Reflexive complement is sich(akk) or sich(dat); inside a fixed phrase it follows the phrase's preposition: außer sich(dat).",
	),
	paragraph(
		"clause",
		"A Clause is dass, ob, w (an indirect w-question), zu+Inf or Inf (a bare infinitive). es before it marks a Required correlate and (es) an Optional one, whatever word the correlate is (es, or the da- word of the Slot's preposition): (auf jmdn./etw.|(es) dass).",
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
		"A verb's frame starts with its subject Slot; a verb whose subject is only an expletive es starts with es instead (es jmdm. irgendwie). Write - when the Reading governs nothing.",
	),
	paragraph(
		"output",
		"Use only the complement kinds `complementKinds` names. Answer with the frame alone: only the notation's pronouns, prepositions, markers and stand-ins, never the Lemma, its fixed words, its separable prefix, a kind's name or any other word.",
	),
];

/** Each example's Lemma, its Emoji Description, whether it is a verb, and the frame Luna answers. */
export const valencyExamples = [
	{
		lemma: "ahnen",
		emoji: "🤔",
		verb: true,
		frame: "jmd. (etw.|(es) dass|(es) ob|(es) w)",
	},
	{
		lemma: "freuen",
		emoji: "🪞😊",
		verb: true,
		frame: "jmd. sich(akk) (auf jmdn./etw.|über jmdn./etw.|(es) dass|(es) zu+Inf)",
	},
	{
		lemma: "halten",
		emoji: "🤔⚖",
		verb: true,
		frame: "jmd. jmdn./etw. für ADJ",
	},
	{ lemma: "fehlen", emoji: "🕳", verb: true, frame: "es jmdm. an etw.(dat)" },
	{ lemma: "dauern", emoji: "⏳", verb: true, frame: "etw. irgendwie lange" },
	{
		lemma: "neidisch",
		emoji: "😒",
		verb: false,
		frame: "(auf jmdn./etw.)",
	},
	{ lemma: "Fenster", emoji: "🪟", verb: false, frame: "-" },
	{ lemma: "den Braten riechen", emoji: "👃🕵", verb: true, frame: "jmd." },
	{
		lemma: "einen Bären aufbinden",
		emoji: "🐻🤥",
		verb: true,
		frame: "jmd. jmdm.",
	},
] as const;

/**
 * The examples as one line, each Reading then its frame; no period after
 * a final `jmdm.`, which ends in one.
 */
export const examplesParagraph = registry.paragraph(
	"valency.examples",
	(() => {
		const line = `Examples: ${valencyExamples
			.map(({ lemma, emoji, frame }) => `${lemma} ${emoji}: ${frame}`)
			.join("; ")}`;
		return line.endsWith(".") ? line : `${line}.`;
	})(),
	valencyRule,
);

/** The examples' Lemmas, for the disjointness test (#693). */
export const valencyExampleLemmas: readonly string[] = valencyExamples.map(
	({ lemma }) => lemma,
);

/** The registered paragraphs, as dumcorpus's citation check reads them. */
export function valencyPromptTexts(): readonly CitingPrompt[] {
	return registry.texts();
}
