/**
 * The valency notation's system prompts: production's linguistic
 * paragraphs, in production's order, then the notation's answer-shape
 * paragraphs in place of production's `valency.shapes` and `valency.output`,
 * then the examples. No example is a Lemma of the Knowledge gold.
 */
import { shared, valency } from "../../../src/knowledge/de/prompts.js";
import { valencyPrompt } from "../../../src/knowledge/de/valency.js";
import { parseGermanFrame } from "./german.js";

/** The linguistic paragraphs every variant keeps, as production sends them. */
const rules = [
	shared.reading,
	shared.evidence,
	valency.task,
	valency.subject,
	valency.reflexive,
	valency.lesart,
	valency.status,
	valency.alternatives,
	valency.freeMarker,
	valency.preposition,
	valency.route,
	valency.fixed,
	valency.referent,
];

/** The notation's paragraphs: what each part of the frame is written as. */
export const notationParagraphs = {
	shape: "Write the frame in German dictionary notation, as Duden and E-VALBU write a pattern: the Slots in frame order separated by single spaces, an Optional Slot in parentheses, a Required one bare, and the alternatives of one Slot joined by | with no spaces around it.",
	caseComplement:
		"A Case complement is the dictionary pronoun, whose form names case and referent: jmd. (Nom), jmdn. (Acc), jmdm. (Dat), jmds. (Gen) for Someone; etw. for Something; jmd./etw., jmdn./etw., jmdm./etw., jmds./etw. for Either. A bare etw. is Nom in a verb's subject Slot and Acc everywhere else; write etw.(dat) or etw.(gen) for those cases.",
	preposition:
		"A Preposition complement is the preposition and its pronoun, the pronoun's form naming the case: auf jmdn., mit jmdm./etw., nach etw. After a two-way preposition (an, auf, in, über, unter, vor, zwischen) a bare etw. names its case: auf etw.(akk), an etw.(dat).",
	reflexive:
		"A Reflexive complement is sich(akk) or sich(dat); inside a fixed phrase it follows the phrase's preposition: außer sich(dat).",
	clause: "A Clause is dass, ob, w (an indirect w-question), zu+Inf or Inf (a bare infinitive). es before it marks a Required correlate and (es) an Optional one, whatever word the correlate is (es, or the da- word of the Slot's preposition): (auf jmdn./etw.|(es) dass).",
	adverbial:
		"An Adverbial is its stand-in: irgendwo (a place), irgendwohin (a direction), irgendwie (a manner), irgendwie lange (a duration), irgendwie viel (an amount).",
	predicative:
		"A Predicative is ADJ, als ADJ or für ADJ, ADJ standing for any predicative adjective or noun. It describes the object when the frame has an Acc Case complement and the subject otherwise; write ADJ(subj) or ADJ(obj) when it describes the other one.",
	subject:
		"A verb's frame starts with its subject Slot; a verb whose subject is only an expletive es starts with es instead (es jmdm. irgendwie). Write - when the Reading governs nothing.",
	output: "Use only the complement kinds `complementKinds` names. Answer with the frame alone, nothing before or after it.",
	headwordOutput:
		"Use only the complement kinds `complementKinds` names. Answer with the dictionary entry alone, nothing before or after it: the frame, then the Lemma's Canonical Form exactly as `reading.lemma` writes it.",
};

type NotationParagraphs = Readonly<
	Record<keyof typeof notationParagraphs, string>
> & {
	/** The Lemma written first, then the frame (r2's `lead` variants). */
	readonly leadOutput?: string;
};

type Example = {
	readonly lemma: string;
	readonly emoji: string;
	readonly verb: boolean;
	readonly frame: string;
};

/** A prompt revision: its paragraphs and its examples, none a Lemma of the Knowledge gold. */
export type Revision = {
	readonly paragraphs: NotationParagraphs;
	readonly examples: readonly Example[];
	/** The revision's guidance beyond the notation, as the JSON control states it. */
	readonly jsonGuidance?: string;
};

/** r1's examples. */
export const firstExamples: readonly Example[] = [
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
];

export type Answer = "frame" | "headword" | "lead";

/** One example's answer in the variant's shape. */
const answerOf = (answer: Answer, { frame, lemma }: Example) =>
	answer === "headword"
		? `${frame} ${lemma}`
		: answer === "lead"
			? `${lemma}: ${frame}`
			: frame;

/** The examples as one line, each answer as `answer` writes it; no period after a final `jmdm.`. */
const examplesLine = (
	examples: readonly Example[],
	answer: (example: Example) => string,
	separator = ": ",
) => {
	const line = `Examples: ${examples
		.map(
			(example) =>
				`${example.lemma} ${example.emoji}${separator}${answer(example)}`,
		)
		.join("; ")}`;
	return line.endsWith(".") ? line : `${line}.`;
};

/** An example's frame as the JSON call answers it. */
const jsonExample = (example: Example) => {
	const read = parseGermanFrame(example.frame, { verb: example.verb });
	if (!read.ok) throw Error(`${example.lemma}: ${read.error}`);
	return JSON.stringify({ valency: read.frame });
};

/**
 * Production's prompt with a revision's examples in JSON, and its JSON
 * guidance when it has some: the control for what the notation's examples
 * and guidance add apart from the notation itself.
 */
export const jsonExamplesPrompt = ({ examples, jsonGuidance }: Revision) =>
	[valencyPrompt, jsonGuidance, examplesLine(examples, jsonExample)]
		.filter((part) => part !== undefined)
		.join("\n");

const closing: Readonly<Record<Answer, keyof NotationParagraphs>> = {
	frame: "output",
	headword: "headwordOutput",
	lead: "leadOutput",
};

/** The notation's system prompt; the answer's paragraph closes it, the examples after it. */
export function notationPrompt(revision: Revision, answer: Answer): string {
	const { paragraphs, examples } = revision;
	const last = paragraphs[closing[answer]];
	if (last === undefined)
		throw Error(`The revision has no ${answer} paragraph`);
	return [
		...rules,
		paragraphs.shape,
		paragraphs.caseComplement,
		paragraphs.preposition,
		paragraphs.reflexive,
		paragraphs.clause,
		paragraphs.adverbial,
		paragraphs.predicative,
		paragraphs.subject,
		last,
		examplesLine(
			examples,
			(example) => answerOf(answer, example),
			answer === "lead" ? " → " : ": ",
		),
	].join("\n");
}
