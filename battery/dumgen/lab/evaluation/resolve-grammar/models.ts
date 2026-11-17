/**
 * The transports a `resolve.grammar` or `resolve.reading` evaluation runs
 * through: jev and Luna behind one disk cache keyed by the request and its
 * repetition, so a re-score replays every answer without a call. Three
 * modes:
 *
 * - `offline` answers only from the cache; a miss fails its attempt.
 * - `live` asks the host's transport on a miss, once, and keeps the answer.
 * - `project` asks nothing: a miss is answered as gold would answer it
 *   (the operation's `GoldOracle`; grammar's is `oracle.ts`), so the
 *   requests that depend on it are found too, and is priced. That is how
 *   a run states its token estimate before any paid call.
 *
 * Every request is priced by `model-pricing.ts`, in a projection and
 * against a live run's caps alike.
 *
 * In `live` mode with a `lunaBatch`, Luna requests go through OpenAI's
 * Batch API in stages (#891, `model-batches.ts`): a pass runs jev live and
 * stops each attempt at its first Luna cache miss, which it collects;
 * `sendLunaBatch` sends the misses as one batch under the round's caps,
 * waits for it and fills the cache; the caller passes again, until a pass
 * collects nothing new.
 */
import { createHash } from "node:crypto";
import { join } from "node:path";
import type { Questions } from "@typesafe-ai/sdk";
import { canonicalJson } from "common-utils";
import type { z } from "zod";
import {
	defaultLunaConfiguration,
	type LunaAsk,
	type LunaConfiguration,
	type LunaRequest,
	type LunaResponse,
} from "../../../src/luna.js";
import { batchRequestLimit, type LunaBatch } from "../../../src/luna-batch.js";
import { lunaTokens } from "../../../src/luna-call.js";
import type { Answers } from "../../../src/segment/ask.js";
import type {
	JevAsk,
	JevRequest,
	JevResponse,
} from "../../../src/segment/jev.js";
import { jevResponseSchema, lunaResponseSchema } from "../../stored-json.js";
import { readEntry, writeEntry } from "./cache-entries.js";
import type { GrammarCase } from "./cases.js";
import {
	type LunaBatchEvent,
	LunaBatchQueue,
	type LunaBatchRecord,
} from "./model-batches.js";
import {
	type Executor,
	type GrammarPrice,
	jevChars,
	lunaChars,
	RequestPricer,
	type StageSize,
} from "./model-pricing.js";
import {
	type ExecutorSpend,
	type GrammarCaps,
	SpendGuard,
} from "./model-spend.js";
import { goldAnswers, goldWritten } from "./oracle.js";
import { jevUsd, type LunaTier, syncTierOf } from "./pricing.js";

export type { LunaBatchEvent } from "./model-batches.js";
export type { GrammarPrice, StageSize } from "./model-pricing.js";
export type { GrammarCaps } from "./model-spend.js";

type ModelMode = "offline" | "live" | "project";

/** What a run spent, the way it reached Luna, and its batches. */
export type ModelsSpend = {
	readonly jev: ExecutorSpend;
	readonly luna: ExecutorSpend;
	readonly lunaTransport: "sync" | "batch";
	readonly usd: {
		readonly jev: number;
		readonly luna: number;
		readonly lunaTier: LunaTier;
	};
	readonly batches: readonly LunaBatchRecord[];
};

const sha256 = (value: unknown) =>
	createHash("sha256").update(canonicalJson(value)).digest("hex");

export type GrammarModelsOptions = {
	readonly directory: string;
	readonly mode: ModelMode;
	/** Asked on a cache miss in `live` mode. */
	readonly jev?: JevAsk;
	readonly luna?: LunaAsk;
	/** In `live` mode, Luna's misses go through this Batch API client instead of `luna`. */
	readonly lunaBatch?: LunaBatch;
	/** Receives each batch as it is sent and settled; the ledger's record. */
	readonly onLunaBatch?: (event: LunaBatchEvent) => void | Promise<void>;
	/** Called before every fresh request or batch; throw to stop spending. */
	readonly beforeSpend?: () => void;
	/** The round's hard caps on fresh tokens; a request that would cross one is refused. */
	readonly caps?: GrammarCaps;
	/** The stage sizes a pricing pass measured, for a live run's caps. */
	readonly stageSizes?: Readonly<Record<string, StageSize>>;
	/** The configuration Luna is priced at; Dumgen's default otherwise. */
	readonly lunaConfiguration?: LunaConfiguration;
	/**
	 * `project` mode: price every request the run sends, the cached ones
	 * at their own cached usage, as a round whose prompts all moved would
	 * pay; otherwise only the cache's misses are priced.
	 */
	readonly wholeRound?: boolean;
};

/** How a case's gold answers the questions and writes the text a projection replays. */
export type GoldOracle<Case> = {
	readonly answers: (goldCase: Case, questions: Questions) => Answers;
	readonly written: (goldCase: Case, input: unknown) => unknown;
};

/** The cached transports of one evaluation, with what they spent or foresaw. */
export class CachedModels<Case> {
	readonly #options: GrammarModelsOptions;
	readonly #guard: SpendGuard;
	readonly #oracle: GoldOracle<Case>;
	readonly #pricer: RequestPricer;
	readonly #queue: LunaBatchQueue | undefined;
	/**
	 * Luna requests sent and not yet answered, by cache key: attempts that
	 * share a request, such as a reading case's arms sharing its draft,
	 * wait for the one sending it instead of paying for it again.
	 */
	readonly #sending = new Map<string, Promise<LunaResponse>>();
	/** The Luna requests a projection has priced, by cache key. */
	readonly #projected = new Set<string>();

	constructor(options: GrammarModelsOptions, oracle: GoldOracle<Case>) {
		this.#options = options;
		this.#oracle = oracle;
		this.#guard = new SpendGuard(options.caps, this.#lunaTier);
		this.#pricer = new RequestPricer({
			lunaConfiguration: this.#lunaConfiguration,
			...(options.stageSizes ? { stageSizes: options.stageSizes } : {}),
			...(options.wholeRound ? { wholeRound: true } : {}),
		});
		this.#queue = options.lunaBatch
			? new LunaBatchQueue({
					batch: options.lunaBatch,
					journals: join(options.directory, "batches"),
					...(options.onLunaBatch
						? { onLunaBatch: options.onLunaBatch }
						: {}),
					store: async (customId, response) => {
						const tokens = this.#spent(response);
						await writeEntry(
							this.#path("luna", customId),
							response,
						);
						return tokens;
					},
				})
			: undefined;
	}

	#path(executor: Executor, key: string) {
		return join(
			this.#options.directory,
			executor,
			key.slice(0, 2),
			`${key}.json`,
		);
	}

	get #lunaConfiguration() {
		return this.#options.lunaConfiguration ?? defaultLunaConfiguration;
	}

	/** The tier Luna's fresh requests pay: the Batch rate, or the configuration's. */
	get #lunaTier(): LunaTier {
		return this.#options.lunaBatch
			? "batch"
			: syncTierOf(this.#lunaConfiguration);
	}

	/** Each stage's measured sizes, from this pass's cache hits or the pricing pass's. */
	get stageSizes(): Readonly<Record<string, StageSize>> {
		return this.#pricer.stageSizes;
	}

	/** What a projection found, its uncached requests priced at the measured sizes. */
	get projection() {
		return this.#pricer.projection;
	}

	/** A projection's price: its requests, dollars, and the sizes that priced them. */
	price(repetitions: number, attempts: number): GrammarPrice {
		return this.#pricer.price(repetitions, attempts);
	}

	/** What the run spent so far. */
	get spend() {
		return this.#guard.spend;
	}

	/** Which cap stopped the run, once one did. */
	get capHit(): string | undefined {
		return this.#guard.capHit;
	}

	/** What the run spent, how it reached Luna, and its batches. */
	report(): ModelsSpend {
		return {
			jev: { ...this.spend.jev },
			luna: { ...this.spend.luna },
			lunaTransport: this.#options.lunaBatch ? "batch" : "sync",
			usd: {
				jev: jevUsd(this.spend.jev.freshInputTokens),
				luna: this.#guard.lunaSpentUsd(),
				lunaTier: this.#lunaTier,
			},
			batches: [...(this.#queue?.records ?? [])],
		};
	}

	/** jev for one attempt at `goldCase`, at `repetition`. */
	jev(goldCase: Case, repetition: number): JevAsk {
		return async (request: JevRequest, context) => {
			const body = {
				model: request.model,
				state: request.state,
				questions: request.questions,
			};
			const keyOf = (at: number) => sha256({ ...body, repetition: at });
			const path = this.#path("jev", keyOf(repetition));
			const { mode } = this.#options;
			const hit = await readEntry(jevResponseSchema, path);
			if (hit) {
				this.spend.jev.cachedCalls++;
				if (mode === "project") {
					this.#pricer.sample(
						"jev",
						context.stage,
						jevChars(request),
						{
							inputTokens: hit.usage.input_tokens,
							outputTokens: hit.usage.output_tokens,
						},
					);
					if (this.#options.wholeRound)
						this.#pricer.exact("jev", hit.usage.input_tokens, 0);
				}
				return hit;
			}
			if (mode === "project") {
				const other = await this.#otherRepetition(
					jevResponseSchema,
					"jev",
					keyOf,
					repetition,
				);
				if (other) {
					this.#pricer.exact("jev", other.usage.input_tokens, 0);
					this.#pricer.sample(
						"jev",
						context.stage,
						jevChars(request),
						{
							inputTokens: other.usage.input_tokens,
							outputTokens: other.usage.output_tokens,
						},
					);
					return other;
				}
				this.#pricer.unpriced(
					"jev",
					context.stage,
					jevChars(request),
					0,
				);
				return {
					model: request.model,
					answers: this.#oracle.answers(goldCase, request.questions),
					usage: { input_tokens: 0, output_tokens: 0 },
				};
			}
			if (mode === "offline" || !this.#options.jev)
				throw Error(
					`jev cache miss in offline mode (${context.stage})`,
				);
			this.#options.beforeSpend?.();
			const estimate = this.#pricer.size(
				"jev",
				context.stage,
				jevChars(request),
				0,
			).input;
			const release = this.#guard.reserveJev(estimate);
			let response: JevResponse;
			try {
				response = await this.#options.jev(request, context);
			} finally {
				release();
			}
			this.spend.jev.freshCalls++;
			this.spend.jev.freshInputTokens += response.usage.input_tokens;
			this.spend.jev.freshOutputTokens += response.usage.output_tokens;
			await writeEntry(path, response);
			return response;
		};
	}

	/** Luna for one attempt at `goldCase`, at `repetition`. */
	luna(goldCase: Case, repetition: number): LunaAsk {
		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complexity baseline (#994): decompose to remove
		return async (request: LunaRequest, context) => {
			const keyOf = (at: number) =>
				sha256({ ...request, repetition: at });
			const key = keyOf(repetition);
			const path = this.#path("luna", key);
			const { mode } = this.#options;
			// A projection prices a request once, however many attempts
			// share it, as the live run sends it once (`#sending`).
			if (mode === "project") {
				if (this.#projected.has(key))
					return (
						(await readEntry(lunaResponseSchema, path)) ?? {
							output: this.#oracle.written(
								goldCase,
								request.input,
							),
						}
					);
				this.#projected.add(key);
			}
			const hit = await readEntry(lunaResponseSchema, path);
			if (hit) {
				this.spend.luna.cachedCalls++;
				if (mode === "project") {
					const tokens = lunaTokens(hit.metadata);
					this.#pricer.sample(
						"luna",
						context.stage,
						lunaChars(request),
						tokens,
					);
					if (this.#options.wholeRound)
						this.#pricer.exact(
							"luna",
							tokens.inputTokens,
							tokens.outputTokens,
						);
				}
				return hit;
			}
			if (mode === "project") {
				const other = await this.#otherRepetition(
					lunaResponseSchema,
					"luna",
					keyOf,
					repetition,
				);
				if (other) {
					const tokens = lunaTokens(other.metadata);
					this.#pricer.exact(
						"luna",
						tokens.inputTokens,
						tokens.outputTokens,
					);
					this.#pricer.sample(
						"luna",
						context.stage,
						lunaChars(request),
						tokens,
					);
					return other;
				}
				const output = this.#oracle.written(goldCase, request.input);
				this.#pricer.unpriced(
					"luna",
					context.stage,
					lunaChars(request),
					canonicalJson({ value: output }).length,
				);
				return { output };
			}
			if (mode === "offline" || (!this.#options.luna && !this.#queue))
				throw Error(
					`Luna cache miss in offline mode (${context.stage})`,
				);
			if (this.#queue) {
				// Staged: the miss waits for the run's next batch, and the
				// attempt stops here; a failed batch line is never re-sent.
				const failure = this.#queue.failure(key);
				if (failure !== undefined) throw Error(failure);
				if (this.capHit !== undefined)
					throw Error(`Stopped at the ${this.capHit}`);
				this.#queue.hold(key, { request, stage: context.stage });
				throw Error(
					`Luna request held for the run's next batch (${context.stage})`,
				);
			}
			const luna = this.#options.luna;
			if (!luna)
				throw Error(
					`Luna cache miss in offline mode (${context.stage})`,
				);
			const sending = this.#sending.get(key);
			if (sending) return sending;
			const sent = this.#send(luna, request, context, path);
			this.#sending.set(key, sent);
			try {
				return await sent;
			} finally {
				this.#sending.delete(key);
			}
		};
	}

	/** Sends one Luna cache miss under the round's caps and caches its answer. */
	async #send(
		luna: LunaAsk,
		request: LunaRequest,
		context: Parameters<LunaAsk>[1],
		path: string,
	): Promise<LunaResponse> {
		this.#options.beforeSpend?.();
		const release = this.#guard.reserveLuna(
			this.#pricer.lunaHold(context.stage, lunaChars(request), false),
		);
		let response: LunaResponse;
		try {
			response = await luna(request, context);
		} finally {
			release();
		}
		this.#spent(response);
		await writeEntry(path, response);
		return response;
	}

	/** Counts a fresh Luna answer's tokens. */
	#spent(response: LunaResponse) {
		const tokens = lunaTokens(response.metadata);
		this.spend.luna.freshCalls++;
		this.spend.luna.freshInputTokens += tokens.inputTokens;
		this.spend.luna.freshOutputTokens += tokens.outputTokens;
		this.spend.luna.freshCachedInputTokens += tokens.cachedInputTokens;
		this.spend.luna.freshCacheWriteTokens += tokens.cacheWriteTokens;
		return tokens;
	}

	/** Luna requests the last pass held for a batch. */
	get pendingLuna(): number {
		return this.#queue?.pending ?? 0;
	}

	/**
	 * Settles the batches an interrupted run sent and never read, filling
	 * the cache from them; none are sent again.
	 */
	async resumeLunaBatches(signal: AbortSignal): Promise<void> {
		await this.#queue?.resume(signal);
	}

	/**
	 * Sends the Luna requests the last pass held as one batch, priced
	 * whole at the Batch rate within what the round's caps leave, waits for
	 * it and fills the cache. False when nothing was sent: none were held,
	 * or the batch would cross a cap, which then stops the run.
	 */
	async sendLunaBatch(signal: AbortSignal): Promise<boolean> {
		const queue = this.#queue;
		if (!queue || queue.pending === 0 || this.capHit !== undefined)
			return false;
		this.#options.beforeSpend?.();
		const held = [...queue.held()].slice(0, batchRequestLimit);
		const admitted = this.#guard.admitBatch(
			held.map(([, { request, stage }]) =>
				this.#pricer.lunaHold(stage, lunaChars(request), true),
			),
		);
		if (admitted.requests === 0) return false;
		await queue.send(
			held,
			{
				inputTokens: admitted.inputTokens,
				outputTokens: admitted.outputTokens,
				usd: admitted.usd,
			},
			signal,
		);
		return true;
	}

	/** The same request answered at another repetition, for pricing. */
	async #otherRepetition<T>(
		schema: z.ZodType<T>,
		executor: Executor,
		keyOf: (repetition: number) => string,
		repetition: number,
	): Promise<T | undefined> {
		for (const at of [0, 1, 2]) {
			if (at === repetition) continue;
			const other = await readEntry(
				schema,
				this.#path(executor, keyOf(at)),
			);
			if (other) return other;
		}
		return undefined;
	}
}

/** `resolve.grammar`'s cached transports, its projections answered by `oracle.ts`. */
export class GrammarModels extends CachedModels<GrammarCase> {
	constructor(options: GrammarModelsOptions) {
		super(options, { answers: goldAnswers, written: goldWritten });
	}
}
