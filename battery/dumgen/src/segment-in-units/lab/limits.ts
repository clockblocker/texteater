/**
 * Limit tests of jev itself, independent of any arm's assembly:
 * `questionsPerCall` asks the same pairwise membership questions over long
 * sentences in chunks of different sizes and compares the answers with a
 * small-chunk baseline and with the baseline's own repetition noise.
 */
import type { Questions } from "promptsmith/typesafe";
import { type Answers, noul } from "../../segment/ask.js";
import { judgeState, sentenceOf } from "../../segment/de/sentence.js";
import type { LabCase } from "./corpus.js";
import type { CallRecord, Jev } from "./jev.js";

export type ChunkingResult = {
	readonly questionsPerCall: number;
	readonly repetition: number;
	readonly sentences: number;
	readonly questions: number;
	readonly calls: number;
	readonly failedCalls: number;
	readonly errors: readonly string[];
	readonly inputTokens: number;
	readonly meanCallLatencyMs: number;
	readonly maxCallLatencyMs: number;
	/** Against the baseline (smallest chunks, repetition 0). */
	readonly meanAbsoluteDifference: number;
	readonly decisionFlips: number;
	readonly compared: number;
};

function pairQuestions(
	labCase: LabCase,
	ref: (id: number) => string,
): Questions {
	const sentence = sentenceOf(labCase.input);
	const questions: Questions = {};
	for (const a of sentence.pieces)
		for (const b of sentence.pieces)
			if (a.id < b.id)
				questions[`p_${a.id}_${b.id}`] = noul(
					`In \`sentence\`, do ${ref(a.id)} and ${ref(b.id)} belong to the same unit? A unit is one word with the pieces it owns (article, separable particle, auxiliaries, required reflexive, governed preposition), or one fixed multiword expression.`,
				);
	return questions;
}

export async function questionsPerCall(args: {
	readonly cases: readonly LabCase[];
	readonly jev: Jev;
	readonly sizes: readonly number[];
	readonly baselineRepetitions: number;
}): Promise<ChunkingResult[]> {
	const prepared = args.cases.map((labCase) => {
		const sentence = sentenceOf(labCase.input);
		const { state, ref } = judgeState(sentence);
		const questions = pairQuestions(labCase, (id) => {
			const piece = sentence.pieces[id - 1];
			if (!piece) throw Error(`No piece p${id}`);
			return ref(piece);
		});
		return { state, questions };
	});
	const [smallest] = [...args.sizes].sort((a, b) => a - b);
	const runs: { size: number; repetition: number }[] = [
		...Array.from(
			{ length: args.baselineRepetitions },
			(_, repetition) => ({ size: smallest ?? 25, repetition }),
		),
		...args.sizes
			.filter((size) => size !== smallest)
			.map((size) => ({ size, repetition: 0 })),
	];
	const answered = new Map<string, Answers[]>();
	const results: Omit<
		ChunkingResult,
		"meanAbsoluteDifference" | "decisionFlips" | "compared"
	>[] = [];
	for (const { size, repetition } of runs) {
		const calls: CallRecord[] = [];
		const errors: string[] = [];
		const answers = await Promise.all(
			prepared.map(async ({ state, questions }) => {
				try {
					return await args.jev.ask({
						stage: `qpc-${size}`,
						state,
						questions,
						repetition,
						calls,
						questionsPerCall: size,
					});
				} catch (error) {
					errors.push(
						error instanceof Error
							? error.message.slice(0, 200)
							: String(error),
					);
					return undefined;
				}
			}),
		);
		answered.set(
			`${size}:${repetition}`,
			answers.map((entry) => entry ?? {}),
		);
		const ok = calls.filter((call) => !call.error);
		results.push({
			questionsPerCall: size,
			repetition,
			sentences: prepared.length,
			questions: prepared.reduce(
				(total, { questions }) => total + Object.keys(questions).length,
				0,
			),
			calls: calls.length,
			failedCalls: calls.length - ok.length,
			errors: [...new Set(errors)],
			inputTokens: ok.reduce(
				(total, call) => total + call.inputTokens,
				0,
			),
			meanCallLatencyMs:
				ok.reduce((total, call) => total + call.latencyMs, 0) /
				Math.max(1, ok.length),
			maxCallLatencyMs: Math.max(0, ...ok.map((call) => call.latencyMs)),
		});
	}
	const baseline = answered.get(`${smallest}:0`) ?? [];
	return results.map((result) => {
		const own =
			answered.get(`${result.questionsPerCall}:${result.repetition}`) ??
			[];
		let difference = 0;
		let flips = 0;
		let compared = 0;
		own.forEach((answers, index) => {
			const base = baseline[index] ?? {};
			for (const [id, answer] of Object.entries(answers)) {
				const other = base[id];
				if (answer.type !== "noul" || other?.type !== "noul") continue;
				compared++;
				difference += Math.abs(answer.noul - other.noul);
				if (answer.noul >= 0.5 !== other.noul >= 0.5) flips++;
			}
		});
		return {
			...result,
			meanAbsoluteDifference: difference / Math.max(1, compared),
			decisionFlips: flips,
			compared,
		};
	});
}
