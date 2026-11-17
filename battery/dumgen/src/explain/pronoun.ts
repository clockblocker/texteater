/**
 * `explain.pronoun`: what one pronoun in a passage refers to, picked by
 * Luna in one call from the noun units the host offers. The passage goes
 * in as text with each candidate marked by an id and the pronoun marked
 * apart; Luna answers ids, and only ids the host offered come back. A
 * pronoun with no candidate to name refers to none, with no call.
 */
import * as Effect from "effect/Effect";
import type { CallLog } from "../call.js";
import { InvalidModelOutput, type ProviderFailure } from "../errors.js";
import { askLuna, type Luna } from "../luna-call.js";
import { pronounExplanationPrompt } from "./de/prompt.js";
import type {
	Antecedent,
	ExplainPronounInput,
	PassageSentence,
} from "./types.js";

const stage = "explanation.pronoun";

/** Well above an answer naming a few ids; a runaway one ends early. */
const MAX_OUTPUT_TOKENS = 200;

/** A candidate as Luna sees it: its id, its words and where the host has it. */
type MarkedCandidate = {
	readonly id: string;
	readonly text: string;
	readonly antecedent: Antecedent;
};

/** The passage as Luna reads it, and the candidates its ids stand for. */
export type MarkedPassage = {
	readonly passage: string;
	readonly pronoun: string;
	readonly candidates: readonly MarkedCandidate[];
};

const isBlank = (text: string) => text.trim() === "";

/**
 * One Sentence's text with its marked runs: each label's Segments wrapped
 * in `wrap`, a blank Segment between two of the same label's taken in.
 */
function markedSentence(
	sentence: PassageSentence,
	labelOf: ReadonlyMap<number, string>,
	wrap: (label: string, text: string) => string,
): string {
	const { segments } = sentence;
	const labels = segments.map(({ index }) => labelOf.get(index));
	for (const [at, segment] of segments.entries()) {
		const before = labels[at - 1];
		if (
			labels[at] === undefined &&
			before !== undefined &&
			isBlank(segment.text) &&
			labels[at + 1] === before
		)
			labels[at] = before;
	}
	let text = sentence.cut ? "… " : "";
	let at = 0;
	while (at < segments.length) {
		const label = labels[at];
		let run = "";
		do {
			run += segments[at]?.text ?? "";
			at += 1;
		} while (
			label !== undefined &&
			at < segments.length &&
			labels[at] === label
		);
		text += label === undefined ? run : wrap(label, run);
	}
	return text;
}

/** The words of one unit, its members' texts in order. */
const wordsOf = (sentence: PassageSentence, members: readonly number[]) =>
	sentence.segments
		.filter(({ index }) => members.includes(index))
		.map(({ text }) => text)
		.join(" ");

/** The pronoun's label; candidate ids are `n1`, `n2`, … */
const PRONOUN = "pronoun";

/**
 * The passage as `explain.pronoun` sends it: its Sentences joined, each
 * candidate marked `[n1:Hund]` with its id, numbered in reading order, and
 * the pronoun marked `<<er>>`.
 */
export function markedPassage(input: ExplainPronounInput): MarkedPassage {
	const candidates: MarkedCandidate[] = [];
	const last = input.passage.length - 1;
	const sentences = input.passage.map((sentence, position) => {
		const labelOf = new Map<number, string>();
		const ordered = [...sentence.candidates].sort(
			(left, right) => Math.min(...left) - Math.min(...right),
		);
		for (const members of ordered) {
			const id = `n${candidates.length + 1}`;
			candidates.push({
				id,
				text: wordsOf(sentence, members),
				antecedent: { sentence: position, segments: [...members] },
			});
			for (const index of members) labelOf.set(index, id);
		}
		if (position === last)
			for (const index of input.pronoun) labelOf.set(index, PRONOUN);
		return markedSentence(sentence, labelOf, (label, text) =>
			label === PRONOUN ? `<<${text}>>` : `[${label}:${text}]`,
		);
	});
	return {
		passage: sentences.join(" ").trim(),
		pronoun: wordsOf(input.passage[last] as PassageSentence, input.pronoun),
		candidates,
	};
}

/** Why the input is no passage `explain.pronoun` can read, if it is not. */
function badInput(input: ExplainPronounInput): string | undefined {
	const language: string = input.language;
	if (language !== "de")
		return `explain.pronoun reads German ("de") only, not ${JSON.stringify(language)}`;
	const last = input.passage.at(-1);
	if (!last) return "explain.pronoun needs a passage";
	if (input.pronoun.length === 0) return "explain.pronoun needs a pronoun";
	const lastIndices = new Set(last.segments.map(({ index }) => index));
	if (!input.pronoun.every((index) => lastIndices.has(index)))
		return "explain.pronoun needs the pronoun among its Sentence's Segments";
	for (const sentence of input.passage) {
		const indices = new Set(sentence.segments.map(({ index }) => index));
		const claimed = new Set<number>(sentence === last ? input.pronoun : []);
		for (const members of sentence.candidates) {
			if (members.length === 0)
				return "explain.pronoun needs each candidate to name its Segments";
			for (const index of members) {
				if (!indices.has(index))
					return "explain.pronoun needs each candidate among its Sentence's Segments";
				if (claimed.has(index))
					return "explain.pronoun needs candidates apart from each other and the pronoun";
				claimed.add(index);
			}
		}
	}
	return undefined;
}

/** Luna's answer: whether the pronoun names a candidate, then which. */
function explanationAnswer(output: unknown):
	| {
			readonly refersTo: "Candidates" | "Nothing";
			readonly ids: readonly string[];
	  }
	| undefined {
	if (typeof output !== "object" || output === null) return undefined;
	const { refersTo, ids } = output as Record<string, unknown>;
	if (refersTo !== "Candidates" && refersTo !== "Nothing") return undefined;
	if (!Array.isArray(ids) || !ids.every((id) => typeof id === "string"))
		return undefined;
	return { refersTo, ids };
}

/**
 * The candidates the pronoun refers to, in the order Luna named them, each
 * once, or none when Luna says it refers to nothing; an id Luna made
 * up is dropped. A passage that is no passage, a
 * pronoun outside its last Sentence or candidates that overlap are a
 * Defect, raised before anything is asked.
 */
export const explainPronoun = Effect.fnUntraced(function* (
	input: ExplainPronounInput,
): Effect.fn.Return<
	readonly Antecedent[],
	ProviderFailure | InvalidModelOutput,
	Luna | CallLog
> {
	const problem = badInput(input);
	if (problem) return yield* Effect.die(Error(problem));
	const marked = markedPassage(input);
	if (marked.candidates.length === 0) return [];
	const byId = new Map(marked.candidates.map((c) => [c.id, c.antecedent]));
	return yield* askLuna(
		stage,
		{
			systemPrompt: pronounExplanationPrompt,
			input: {
				passage: marked.passage,
				pronoun: marked.pronoun,
				candidates: marked.candidates.map(({ id, text }) => ({
					id,
					text,
				})),
			},
			outputFormat: "json",
			outputSchema: {
				type: "object",
				properties: {
					refersTo: {
						type: "string",
						enum: ["Candidates", "Nothing"],
					},
					ids: {
						type: "array",
						items: { type: "string", enum: [...byId.keys()] },
					},
				},
				required: ["refersTo", "ids"],
				additionalProperties: false,
			},
			maxOutputTokens: MAX_OUTPUT_TOKENS,
		},
		(output) => {
			const answer = explanationAnswer(output);
			if (!answer)
				return new InvalidModelOutput({
					stage,
					message: `Luna answered no explanation: ${JSON.stringify(output)?.slice(0, 80)}`,
				});
			if (answer.refersTo === "Nothing") return [];
			return [...new Set(answer.ids)].flatMap((id) => {
				const antecedent = byId.get(id);
				return antecedent ? [antecedent] : [];
			});
		},
	);
});
