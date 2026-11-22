/**
 * `structure.recover`: restores lost paragraph and dialogue-turn breaks in
 * flattened paragraphs (such as Kindle or PDF copy-pastes) without altering
 * a single character of any Sentence.
 *
 * Deterministic rules stay in code (`dumtext`'s `analyzeQuotationFlow` and
 * `needsParagraphRecovery`):
 * - Well-formatted paragraphs pass through untouched with zero model calls.
 * - Inside a flattened paragraph, boundaries inside an unclosed quotation
 *   are never split and never sent to jev.
 * - Direct quote-to-quote speaker switches (`...« »...`) split
 *   deterministically in code.
 * - Only the remaining candidate boundaries are judged by jev in parallel
 *   overlapping windows, with sharper criteria for dialogue-adjacent edges
 *   versus pure narration shifts.
 */
import {
	analyzeQuotationFlow,
	needsParagraphRecovery,
	type QuoteFlow,
} from "dumtext";
import * as Effect from "effect/Effect";
import { CallLog } from "../call.js";
import { type Jev, stageAsk } from "../jev-call.js";
import { type AskFailure, choice, choiceOf } from "../segment/ask.js";

export type RecoverStructureInput = {
	/** As `splitText` or `splitScroll` gives them: non-blank Sentences, paragraph by paragraph. */
	readonly paragraphs: readonly { readonly sentences: readonly string[] }[];
};

/** The input's Sentences regrouped into recovered paragraphs, verbatim and in order. */
export type RecoveredText = {
	readonly paragraphs: readonly { readonly sentences: readonly string[] }[];
};

/** Target number of Sentences judged per jev request. */
const windowSize = 40;
/** Left-hand context Sentences carried into a later window so speaker tracking never resets. */
const contextOverlap = 6;
/** Maximum characters of one Sentence sent in jev state/instructions. */
const maxPreviewChars = 500;

/** Probability threshold for splitting a dialogue-adjacent boundary. */
const dialogueBreakThreshold = 0.55;
/** Probability threshold for splitting a pure narrative boundary. */
const narrationBreakThreshold = 0.65;

const dialogueCriteria = {
	NewParagraph:
		"A new paragraph starts here: a different character begins speaking or acting; narration shifts to a character's dialogue (unless the previous sentence is that same speaker's immediate lead-in action beat); or dialogue finishes and narration moves to a separate beat, another character's reaction, or a scene shift.",
	SameParagraph:
		"The same paragraph continues: the same speaker continues talking (e.g. a second spoken sentence right after their own dialogue tag) or does their own action beat/aside right beside their speech, OR the previous sentence is an action beat immediately introducing the same character's spoken line here.",
} as const;

const narrationCriteria = {
	NewParagraph:
		"A clear new paragraph starts here: distinct topic shift, new narrative beat, change of focus/subject, or a different character acting.",
	SameParagraph:
		"Continues the current paragraph: elaborates the same topic, moment, description, or short follow-up remark.",
} as const;

function preview(sentence: string): string {
	if (sentence.length <= maxPreviewChars) return sentence;
	const slice = sentence.slice(0, maxPreviewChars);
	const space = slice.lastIndexOf(" ");
	return `${(space > maxPreviewChars / 2 ? slice.slice(0, space) : slice).trimEnd()}…`;
}

const boundaryQuestion = (
	localIndex: number,
	previous: string,
	current: string,
	dialogueEdge: boolean,
) =>
	choice(
		dialogueEdge
			? `In this passage whose paragraph breaks were stripped, decide whether \`sentences[${localIndex}]\` starts a new paragraph after \`sentences[${localIndex - 1}]\`. \`sentences[${localIndex - 1}]\` is ${JSON.stringify(previous)} and \`sentences[${localIndex}]\` is ${JSON.stringify(current)}.`
			: `In this prose passage whose paragraph breaks were stripped, decide whether \`sentences[${localIndex}]\` starts a new paragraph after \`sentences[${localIndex - 1}]\`. \`sentences[${localIndex - 1}]\` is ${JSON.stringify(previous)} and \`sentences[${localIndex}]\` is ${JSON.stringify(current)}.`,
		dialogueEdge ? dialogueCriteria : narrationCriteria,
	);

/** Even consecutive windows covering `[0, count)`. */
function windowsOf(count: number): (readonly [number, number])[] {
	const windows = Math.ceil(count / windowSize);
	const size = Math.ceil(count / Math.max(windows, 1));
	return Array.from({ length: windows }, (_, window) => [
		window * size,
		Math.min(count, (window + 1) * size),
	]);
}

type BoundaryDecision =
	| {
			readonly boundary: number;
			readonly by: "InQuote" | "DirectQuote";
			readonly split: boolean;
	  }
	| {
			readonly boundary: number;
			readonly by: "Judge";
			readonly dialogueEdge: boolean;
			readonly probability: number;
			readonly split: boolean;
	  };

/** Recovers paragraphs inside one flattened paragraph's Sentences. */
const recoverParagraph = Effect.fnUntraced(function* (
	sentences: readonly string[],
): Effect.fn.Return<
	{
		readonly paragraphs: readonly {
			readonly sentences: readonly string[];
		}[];
		readonly decisions: readonly BoundaryDecision[];
	},
	AskFailure,
	Jev | CallLog
> {
	const flow = analyzeQuotationFlow(sentences);
	const ask = yield* stageAsk;
	const previews = sentences.map(preview);

	// Classify each boundary [1..sentences.length - 1] in code first.
	const deterministic = new Map<number, BoundaryDecision>();
	const dialogueEdges = new Map<number, boolean>();
	for (let index = 1; index < sentences.length; index++) {
		const prev = flow[index - 1] as QuoteFlow;
		const curr = flow[index] as QuoteFlow;
		if (prev.endsInsideQuote && !curr.opensQuote) {
			deterministic.set(index, {
				boundary: index,
				by: "InQuote",
				split: false,
			});
			continue;
		}
		if (curr.directSpeakerSwitchBefore) {
			deterministic.set(index, {
				boundary: index,
				by: "DirectQuote",
				split: true,
			});
			continue;
		}
		dialogueEdges.set(index, prev.hasQuote || curr.hasQuote);
	}

	const judgedWindows = yield* Effect.forEach(
		windowsOf(sentences.length),
		([start, end]) => {
			const contextStart = Math.max(0, start - contextOverlap);
			const stateSentences = previews.slice(contextStart, end);
			const questions: Record<string, ReturnType<typeof choice>> = {};
			for (let index = Math.max(1, start); index < end; index++) {
				if (deterministic.has(index)) continue;
				const local = index - contextStart;
				questions[`boundary-${index}`] = boundaryQuestion(
					local,
					stateSentences[local - 1] ?? "",
					stateSentences[local] ?? "",
					dialogueEdges.get(index) === true,
				);
			}
			if (Object.keys(questions).length === 0)
				return Effect.succeed(new Map<number, BoundaryDecision>());
			return ask({
				stage: "structure",
				state: { sentences: stateSentences },
				questions,
			}).pipe(
				Effect.map((answers) => {
					const decisions = new Map<number, BoundaryDecision>();
					for (const id of Object.keys(questions)) {
						const index = Number(id.slice("boundary-".length));
						const answer = choiceOf(answers, id);
						const dialogueEdge = dialogueEdges.get(index) === true;
						const probability =
							answer.probabilities.NewParagraph ??
							(answer.choice === "NewParagraph"
								? answer.confidence
								: 1 - answer.confidence);
						const threshold = dialogueEdge
							? dialogueBreakThreshold
							: narrationBreakThreshold;
						decisions.set(index, {
							boundary: index,
							by: "Judge",
							dialogueEdge,
							probability,
							split: probability >= threshold,
						});
					}
					return decisions;
				}),
			);
		},
		{ concurrency: "unbounded" },
	);

	const judged = new Map(judgedWindows.flatMap((window) => [...window]));
	const decisions: BoundaryDecision[] = [];
	const grouped: { readonly sentences: readonly string[] }[] = [];
	let current: string[] = sentences[0] === undefined ? [] : [sentences[0]];
	for (let index = 1; index < sentences.length; index++) {
		const decision = deterministic.get(index) ?? judged.get(index);
		if (decision !== undefined) decisions.push(decision);
		if (decision?.split && current.length > 0) {
			grouped.push({ sentences: current });
			current = [];
		}
		const sentence = sentences[index];
		if (sentence !== undefined) current.push(sentence);
	}
	if (current.length > 0) grouped.push({ sentences: current });
	return { paragraphs: grouped, decisions };
});

type ParagraphRecovery = {
	readonly paragraphIndex: number;
	readonly recovered: boolean;
	readonly paragraphs: readonly { readonly sentences: readonly string[] }[];
	readonly decisions: readonly BoundaryDecision[];
};

/** The body of `structure.recover`. */
export const recoverStructure = Effect.fnUntraced(function* (
	input: RecoverStructureInput,
): Effect.fn.Return<RecoveredText, AskFailure, Jev | CallLog> {
	const log = yield* CallLog;
	const recovered = yield* Effect.forEach(
		input.paragraphs,
		(
			{ sentences },
			paragraphIndex,
		): Effect.Effect<ParagraphRecovery, AskFailure, Jev | CallLog> =>
			needsParagraphRecovery(sentences)
				? recoverParagraph(sentences).pipe(
						Effect.map((result) => ({
							paragraphIndex,
							recovered: true,
							...result,
						})),
					)
				: Effect.succeed({
						paragraphIndex,
						recovered: false,
						paragraphs: [{ sentences }],
						decisions: [],
					}),
		{ concurrency: "unbounded" },
	);
	const paragraphs = recovered.flatMap((item) => item.paragraphs);
	const recoveredEntries = recovered.filter((item) => item.recovered);
	if (recoveredEntries.length > 0) {
		log.event({
			name: "RecoveredStructure",
			data: recoveredEntries.map(({ paragraphIndex, decisions }) => ({
				paragraph: paragraphIndex,
				splits: decisions.filter(({ split }) => split).length,
				decisions,
			})),
		});
	}
	return { paragraphs };
});
