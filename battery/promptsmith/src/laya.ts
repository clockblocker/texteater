/**
 * Laya transport: a local, non-generative decision model behind the same
 * executor shape as `./typesafe.ts`, so an operation can be pointed at it
 * without changing its questions.
 *
 * Laya answers one question per sequence in a single batched forward pass, so
 * unlike Jev it has no shared request budget: every question independently
 * carries the state truncated to the checkpoint's window (512 tokens English,
 * 1024 multilingual) minus whatever its own options and instructions consume.
 * `fits` reports that arithmetic before a call so a caller can refuse rather
 * than silently judge a truncated state.
 */

import type {
	Questions,
	RequestOptions,
	SystemOneRequest,
	SystemOneResult,
} from "./typesafe.js";

export type LayaCheckpoint = "english" | "multilingual" | "typed-decisions";

export type LayaClientConfig = {
	/** The local sidecar; nothing leaves the machine. */
	readonly baseUrl?: string;
	/** Omitted lets the server's Router choose from script and language. */
	readonly model?: LayaCheckpoint;
	/**
	 * The language of the state. The 0.3.x detector knows only en, fr, de, es,
	 * pt, it and nl among Latin scripts; every other Latin-script language is
	 * silently answered by the English checkpoint, so pass this whenever the
	 * caller knows it.
	 */
	readonly lang?: string;
	readonly timeoutMs?: number;
};

/** What one question costs in its own sequence, and what is left for the state. */
export type QuestionBudget = {
	readonly id: string;
	readonly options: number;
	/** Option token cap after the head budget is shared out; 48 when uncapped. */
	readonly perOptionTokens: number;
	/** Instruction tokens the head budget keeps. */
	readonly instructionTokens: number;
	/** Tokens left for the state in this question's sequence. */
	readonly stateTokens: number;
};

export type LayaAnswer = {
	readonly type: "choice" | "score" | "noul";
	readonly choice?: string;
	readonly score?: number;
	readonly noul?: number;
	readonly confidence?: number;
	readonly probabilities?: Readonly<Record<string, number>>;
	readonly legend?: Readonly<Record<string, string>>;
	readonly action?: { readonly act_probability: number };
};

export type LayaResult = {
	readonly answers: Readonly<Record<string, LayaAnswer>>;
	readonly usage?: { readonly input_tokens?: number };
	readonly routing?: Readonly<Record<string, unknown>>;
	readonly latency_ms?: number;
	readonly device?: string;
};

const WINDOW: Readonly<Record<LayaCheckpoint, { max: number; head: number }>> =
	{
		english: { max: 512, head: 192 },
		multilingual: { max: 1024, head: 256 },
		"typed-decisions": { max: 1024, head: 256 },
	};

/** Laya truncates rather than refuses, so oversized questions must be caught here. */
export class LayaBudgetError extends Error {
	constructor(
		readonly overflowing: readonly QuestionBudget[],
		readonly stateTokens: number,
	) {
		const worst = overflowing[0];
		super(
			`Laya cannot carry this state: ${stateTokens} state tokens, but question ${worst?.id} leaves ${worst?.stateTokens}. ${overflowing.length} question(s) would judge a truncated state.`,
		);
		this.name = "LayaBudgetError";
	}
}

/** Approximate ModernBERT tokenization; the exact count comes from the server. */
function estimateTokens(text: string): number {
	return Math.ceil(text.length / 3.3);
}

function serializeState(state: unknown): string {
	return typeof state === "string" ? state : JSON.stringify(state);
}

function optionTextsOf(question: Questions[string]): readonly string[] {
	if (question.type === "noul") {
		const criteria = question.criteria as
			| { true?: string; false?: string }
			| undefined;
		return [criteria?.true ?? "true", criteria?.false ?? "false"];
	}
	if (question.type === "score")
		return question.criteria as readonly string[];
	const criteria = question.criteria as Record<string, string | null>;
	return Object.entries(criteria).map(([key, value]) =>
		value ? `${key}: ${value}` : key,
	);
}

/**
 * The per-question budget Laya's `build_sequence` produces, mirrored in code so
 * a caller can see the truncation before paying for it.
 */
export function budgetFor(
	state: unknown,
	questions: Questions,
	checkpoint: LayaCheckpoint = "english",
): {
	readonly stateTokens: number;
	readonly perQuestion: readonly QuestionBudget[];
} {
	const window = WINDOW[checkpoint];
	const stateTokens = estimateTokens(serializeState(state));
	const perQuestion = Object.entries(questions).map(([id, question]) => {
		const options = optionTextsOf(question);
		const optionTokens = options.map((option) =>
			Math.min(48, estimateTokens(option)),
		);
		let perOption = 48;
		let used = optionTokens.reduce((sum, n) => sum + n + 1, 0);
		if (window.head - used < 16) {
			perOption = Math.max(
				4,
				Math.floor((window.head - 16) / Math.max(1, options.length)),
			);
			used = options.length * (perOption + 1);
		}
		const instructionTokens = Math.min(
			estimateTokens(String(question.instructions)),
			Math.max(8, window.head - used),
		);
		return {
			id,
			options: options.length,
			perOptionTokens: perOption,
			instructionTokens,
			stateTokens: Math.max(0, window.max - used - instructionTokens - 3),
		};
	});
	return { stateTokens, perQuestion };
}

/** Questions whose sequence cannot hold the whole state, worst first. */
export function overflowing(
	state: unknown,
	questions: Questions,
	checkpoint: LayaCheckpoint = "english",
): readonly QuestionBudget[] {
	const { stateTokens, perQuestion } = budgetFor(state, questions, checkpoint);
	return perQuestion
		.filter((entry) => entry.stateTokens < stateTokens)
		.sort((a, b) => a.stateTokens - b.stateTokens);
}

/**
 * Laya's answers in the SystemOneResult shape. Score returns an expected level
 * over the same ordered criteria, and noul a probability, so the validation in
 * `dumgen/universal/judgment.ts` accepts them unchanged.
 */
function adapt<const Q extends Questions>(
	questions: Q,
	result: LayaResult,
): SystemOneResult<Q> {
	const answers = Object.fromEntries(
		Object.entries(questions).map(([id, question]) => {
			const answer = result.answers[id];
			if (!answer) throw Error(`Laya returned no answer for ${id}`);
			if (question.type === "noul")
				return [id, { type: "noul", noul: answer.noul ?? 0 }];
			const probabilities = answer.probabilities ?? {};
			if (question.type === "score")
				return [
					id,
					{
						type: "score",
						score: answer.score ?? 0,
						confidence: answer.confidence ?? 0,
						legend: Object.fromEntries(
							(question.criteria as readonly string[]).map(
								(level, index) => [index, level],
							),
						),
						probabilities: Object.fromEntries(
							(question.criteria as readonly string[]).map(
								(_, index) => [
									index,
									probabilities[String(index)] ?? 0,
								],
							),
						),
					},
				];
			return [
				id,
				{
					type: "choice",
					choice: answer.choice,
					confidence: answer.confidence ?? 0,
					probabilities,
				},
			];
		}),
	);
	return { answers } as SystemOneResult<Q>;
}

/**
 * A Laya-backed executor. `strict` refuses a call whose state would be
 * truncated for any question instead of returning a judgment made on a
 * fragment of it.
 */
export function createLayaExecutor(
	config: LayaClientConfig & { readonly strict?: boolean } = {},
) {
	const baseUrl = config.baseUrl ?? "http://127.0.0.1:8770";
	const checkpoint = config.model ?? "english";
	return async <const Q extends Questions>(
		request: SystemOneRequest<Q>,
		options?: RequestOptions,
	): Promise<SystemOneResult<Q> & { readonly requestId?: string }> => {
		const questions = request.questions as Questions;
		if (config.strict !== false) {
			const over = overflowing(request.state, questions, checkpoint);
			if (over.length)
				throw new LayaBudgetError(
					over,
					budgetFor(request.state, questions, checkpoint).stateTokens,
				);
		}
		const response = await fetch(`${baseUrl}/api/predict`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				state: request.state,
				questions,
				...(config.model ? { model: config.model } : {}),
				...(config.lang ? { lang: config.lang } : {}),
			}),
			signal: options?.signal ?? null,
		});
		if (!response.ok)
			throw Error(
				`Laya ${response.status}: ${(await response.text()).slice(0, 200)}`,
			);
		return adapt(request.questions, (await response.json()) as LayaResult);
	};
}
