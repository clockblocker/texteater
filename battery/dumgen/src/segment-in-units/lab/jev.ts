/**
 * The lab's jev client: one System One request per chunk of questions, with
 * every answer cached on disk by (model, state, questions, repetition), so a
 * re-score or a threshold sweep never calls jev again, and each fresh call
 * recorded for the cost ledger. Repetition `r` of a request is its own cache
 * entry: a noise rerun offsets its repetitions to miss the cache.
 *
 * The model is pinned: the client requests a jev version, refuses an answer
 * from any other, and so keys the cache by the model that answered. A
 * floating alias (`jev-latest`) needs `allowFloatingModel`.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { stableJson } from "promptsmith";
import {
	createTypeSafeExecutor,
	type EntryType,
	type Question,
	type Questions,
	type TypeSafeExecutor,
} from "promptsmith/typesafe";

export type Answer =
	| { readonly type: "noul"; readonly noul: number }
	| {
			readonly type: "choice";
			readonly choice: string;
			readonly confidence: number;
			readonly probabilities: Readonly<Record<string, number>>;
	  }
	| {
			readonly type: "score";
			readonly score: number;
			readonly confidence: number;
			readonly probabilities: Readonly<Record<string, number>>;
	  };

export type Answers = Readonly<Record<string, Answer>>;

/** One request as the ledger and the run record see it. */
export type CallRecord = {
	readonly executor: "jev" | "luna";
	readonly stage: string;
	readonly questions: number;
	readonly inputTokens: number;
	readonly outputTokens: number;
	readonly latencyMs: number;
	readonly cached: boolean;
	readonly error?: string;
};

type Cached = {
	readonly model: string;
	readonly answers: Answers;
	readonly usage: {
		readonly input_tokens: number;
		readonly output_tokens: number;
	};
	readonly latencyMs: number;
};

export class Semaphore {
	#free: number;
	readonly #waiting: (() => void)[] = [];
	constructor(size: number) {
		this.#free = size;
	}
	async use<T>(work: () => Promise<T>): Promise<T> {
		if (this.#free > 0) this.#free--;
		else await new Promise<void>((resolve) => this.#waiting.push(resolve));
		try {
			return await work();
		} finally {
			const next = this.#waiting.shift();
			if (next) next();
			else this.#free++;
		}
	}
}

export function hashOf(value: unknown): string {
	return createHash("sha256").update(stableJson(value)).digest("hex");
}

export async function readCache<T>(path: string): Promise<T | undefined> {
	try {
		return JSON.parse(await readFile(path, "utf8")) as T;
	} catch {
		return undefined;
	}
}

export async function writeCache(path: string, value: unknown): Promise<void> {
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, JSON.stringify(value));
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function statusOf(error: unknown): number | undefined {
	if (error && typeof error === "object" && "status" in error) {
		const status = (error as { status: unknown }).status;
		return typeof status === "number" ? status : undefined;
	}
	return undefined;
}

/** The jev version lab runs request unless told otherwise. */
export const pinnedJevModel = "jev-1.13.0";

/** Cache entries written before pinning were keyed by this alias. */
const legacyAlias = "jev-latest";

const isFloating = (model: string) => model.endsWith("-latest");

export type JevOptions = {
	readonly cacheDirectory: string;
	/** A pinned jev version; defaults to `pinnedJevModel`. */
	readonly model?: string;
	/** Allow an alias such as `jev-latest`, whose answers may come from any version. */
	readonly allowFloatingModel?: boolean;
	/** Questions per request; larger batches are split. */
	readonly questionsPerCall?: number;
	readonly concurrency?: number;
	/** Transport retries; the historical lab defaults to six. Set zero for a bounded pilot. */
	readonly maxRetries?: number;
	/** Called before every fresh request; throw to stop spending. */
	readonly beforeSpend?: () => void;
	readonly executor?: TypeSafeExecutor;
	/** Answer only from the cache; a miss throws. */
	readonly offline?: boolean;
	/** Receives the input tokens of every fresh request. */
	readonly onSpend?: (inputTokens: number) => void;
};

export class Jev {
	readonly model: string;
	readonly questionsPerCall: number;
	/** Every model an answer came from, cached ones included. */
	readonly resolvedModels = new Set<string>();
	readonly #options: JevOptions;
	readonly #semaphore: Semaphore;
	readonly #requests = new Map<string, Set<string>>();
	#executor: TypeSafeExecutor | undefined;
	constructor(options: JevOptions) {
		this.#options = options;
		this.model = options.model ?? pinnedJevModel;
		if (isFloating(this.model) && !options.allowFloatingModel)
			throw Error(
				`${this.model} floats between jev versions; pin a version or allow a floating model`,
			);
		this.questionsPerCall = options.questionsPerCall ?? 300;
		this.#semaphore = new Semaphore(options.concurrency ?? 12);
		this.#executor = options.executor;
	}

	/**
	 * Per stage, one hash over the distinct requests (state and questions)
	 * asked so far. Repetition and model are left out: a noise rerun of the
	 * same configuration sends the same prompts.
	 */
	promptHashes(): Record<string, string> {
		return Object.fromEntries(
			[...this.#requests]
				.sort(([a], [b]) => a.localeCompare(b))
				.map(([stage, hashes]) => [stage, hashOf([...hashes].sort())]),
		);
	}

	/**
	 * Asks every question against one state and returns the merged answers.
	 * Chunks run in parallel. `calls` receives one record per chunk.
	 */
	async ask(args: {
		readonly stage: string;
		readonly state: EntryType;
		readonly questions: Questions;
		readonly repetition: number;
		readonly calls: CallRecord[];
		readonly questionsPerCall?: number;
	}): Promise<Answers> {
		const entries = Object.entries(args.questions);
		if (entries.length === 0) return {};
		const stageRequests = this.#requests.get(args.stage) ?? new Set();
		this.#requests.set(args.stage, stageRequests);
		stageRequests.add(
			hashOf({ state: args.state, questions: args.questions }),
		);
		const size = args.questionsPerCall ?? this.questionsPerCall;
		const chunks: [string, Question][][] = [];
		for (let start = 0; start < entries.length; start += size)
			chunks.push(entries.slice(start, start + size));
		const parts = await Promise.all(
			chunks.map((chunk) =>
				this.#askChunk(args, Object.fromEntries(chunk) as Questions),
			),
		);
		return Object.assign({}, ...parts) as Answers;
	}

	async #askChunk(
		args: {
			readonly stage: string;
			readonly state: EntryType;
			readonly repetition: number;
			readonly calls: CallRecord[];
		},
		questions: Questions,
	): Promise<Answers> {
		const pathOf = (model: string) => {
			const key = hashOf({
				model,
				state: args.state,
				questions,
				repetition: args.repetition,
			});
			return join(
				this.#options.cacheDirectory,
				"jev",
				key.slice(0, 2),
				`${key}.json`,
			);
		};
		const path = pathOf(this.model);
		let hit = await readCache<Cached>(path);
		if (!hit && !isFloating(this.model)) {
			// Before pinning, entries were keyed by the alias; reuse one only
			// when the version that answered it is the pinned one.
			const legacy = await readCache<Cached>(pathOf(legacyAlias));
			if (legacy?.model === this.model) {
				hit = legacy;
				await writeCache(path, legacy);
			}
		}
		if (hit) {
			this.resolvedModels.add(hit.model);
			args.calls.push({
				executor: "jev",
				stage: args.stage,
				questions: Object.keys(questions).length,
				inputTokens: hit.usage.input_tokens,
				outputTokens: hit.usage.output_tokens,
				latencyMs: hit.latencyMs,
				cached: true,
			});
			return hit.answers;
		}
		if (this.#options.offline)
			throw Error(`jev cache miss in offline mode (${args.stage})`);
		const result = await this.#semaphore.use(async () => {
			this.#options.beforeSpend?.();
			this.#executor ??= createTypeSafeExecutor();
			for (let attempt = 0; ; attempt++) {
				const started = performance.now();
				try {
					const response = await this.#executor(
						{ model: this.model, state: args.state, questions },
						{ timeout: 120_000, retry: { maxRetries: 0 } },
					);
					return {
						model: response.model,
						answers: response.answers as unknown as Answers,
						usage: {
							input_tokens: response.usage.input_tokens,
							output_tokens: response.usage.output_tokens,
						},
						latencyMs: performance.now() - started,
					} satisfies Cached;
				} catch (error) {
					const status = statusOf(error);
					const retryable =
						status === undefined ||
						status === 429 ||
						status === 529 ||
						status >= 500;
					if (
						!retryable ||
						attempt >= (this.#options.maxRetries ?? 6)
					) {
						args.calls.push({
							executor: "jev",
							stage: args.stage,
							questions: Object.keys(questions).length,
							inputTokens: 0,
							outputTokens: 0,
							latencyMs: performance.now() - started,
							cached: false,
							error:
								error instanceof Error
									? error.message
									: String(error),
						});
						throw error;
					}
					await sleep(1000 * 2 ** attempt + Math.random() * 500);
				}
			}
		});
		this.#options.onSpend?.(result.usage.input_tokens);
		this.resolvedModels.add(result.model);
		if (!isFloating(this.model) && result.model !== this.model) {
			const error = `Expected pinned ${this.model}, jev answered as ${result.model}`;
			args.calls.push({
				executor: "jev",
				stage: args.stage,
				questions: Object.keys(questions).length,
				inputTokens: result.usage.input_tokens,
				outputTokens: result.usage.output_tokens,
				latencyMs: result.latencyMs,
				cached: false,
				error,
			});
			throw Error(error);
		}
		const missing = Object.keys(questions).filter(
			(id) => !(id in result.answers),
		);
		if (missing.length > 0)
			throw Error(
				`jev answered without ${missing.slice(0, 3).join(", ")}`,
			);
		await writeCache(path, result);
		args.calls.push({
			executor: "jev",
			stage: args.stage,
			questions: Object.keys(questions).length,
			inputTokens: result.usage.input_tokens,
			outputTokens: result.usage.output_tokens,
			latencyMs: result.latencyMs,
			cached: false,
		});
		return result.answers;
	}
}

export function noulOf(answers: Answers, id: string): number {
	const answer = answers[id];
	if (answer?.type !== "noul") throw Error(`No Noul answer ${id}`);
	return answer.noul;
}

export function choiceOf(
	answers: Answers,
	id: string,
): Extract<Answer, { type: "choice" }> {
	const answer = answers[id];
	if (answer?.type !== "choice") throw Error(`No Choice answer ${id}`);
	return answer;
}

export function scoreOf(
	answers: Answers,
	id: string,
): Extract<Answer, { type: "score" }> {
	const answer = answers[id];
	if (answer?.type !== "score") throw Error(`No Score answer ${id}`);
	return answer;
}

export const noul = (
	instructions: EntryType,
	criteria?: { true?: EntryType; false?: EntryType },
): Question => ({
	type: "noul",
	instructions,
	...(criteria ? { criteria } : {}),
});

export const choice = (
	instructions: EntryType,
	criteria: Record<string, EntryType>,
): Question => ({ type: "choice", instructions, criteria });

export const score = (
	instructions: EntryType,
	criteria: readonly [EntryType, EntryType, ...EntryType[]],
): Question => ({ type: "score", instructions, criteria });
