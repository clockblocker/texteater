/**
 * The transports a `resolve.grammar` evaluation runs through: jev and Luna
 * behind one disk cache keyed by the request and its repetition, so a
 * re-score replays every answer without a call. Three modes:
 *
 * - `offline` answers only from the cache; a miss fails its attempt.
 * - `live` asks the host's transport on a miss, once, and keeps the answer.
 * - `project` asks nothing: a miss is answered as gold would answer it
 *   (`oracle.ts`), so the requests that depend on it are found too, and
 *   is priced by its size. That is how a run states its token estimate
 *   before any paid call.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { stableJson } from "promptsmith";
import type { LunaAsk, LunaRequest, LunaResponse } from "../../luna.js";
import { lunaTokens } from "../../luna-call.js";
import type { JevAsk, JevRequest, JevResponse } from "../../segment/jev.js";
import type { GrammarCase } from "./cases.js";
import { goldAnswers, goldWritten } from "./oracle.js";

export type ModelMode = "offline" | "live" | "project";

/**
 * Characters per input token of a jev request (its state and questions as
 * JSON): measured on 503 cached segment.inUnits dev requests on 2026-10-03
 * (5,259,599 characters, 1,827,732 input tokens).
 */
export const jevCharsPerToken = 2.88;
/**
 * Characters per token of a Luna request's prompt and input, and of its
 * output: OpenAI's tokenizers give about 3.5 for German with English JSON.
 * An estimate, not a measurement; the first live run measures it.
 */
export const lunaCharsPerToken = 3.5;

/** What one executor spent: fresh calls and tokens, and calls the cache answered. */
export type ExecutorSpend = {
	freshCalls: number;
	freshInputTokens: number;
	freshOutputTokens: number;
	cachedCalls: number;
};

/** What a projection found: requests the cache misses, and their priced tokens. */
export type ExecutorProjection = {
	requests: number;
	inputTokens: number;
	outputTokens: number;
	/** Of `requests`, those whose price is the cached price of another repetition. */
	pricedFromCache: number;
};

const sha256 = (value: unknown) =>
	createHash("sha256").update(stableJson(value)).digest("hex");

async function readEntry<T>(path: string): Promise<T | undefined> {
	try {
		return JSON.parse(await readFile(path, "utf8")) as T;
	} catch {
		return undefined;
	}
}

async function writeEntry(path: string, value: unknown): Promise<void> {
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, JSON.stringify(value));
}

const fresh = (): ExecutorSpend => ({
	freshCalls: 0,
	freshInputTokens: 0,
	freshOutputTokens: 0,
	cachedCalls: 0,
});
const projected = (): ExecutorProjection => ({
	requests: 0,
	inputTokens: 0,
	outputTokens: 0,
	pricedFromCache: 0,
});

export type GrammarModelsOptions = {
	readonly directory: string;
	readonly mode: ModelMode;
	/** Asked on a cache miss in `live` mode. */
	readonly jev?: JevAsk;
	readonly luna?: LunaAsk;
	/** Called before every fresh request; throw to stop spending. */
	readonly beforeSpend?: () => void;
};

/** The cached transports of one evaluation, with what they spent or foresaw. */
export class GrammarModels {
	readonly spend = { jev: fresh(), luna: fresh() };
	readonly projection = { jev: projected(), luna: projected() };
	readonly #options: GrammarModelsOptions;

	constructor(options: GrammarModelsOptions) {
		this.#options = options;
	}

	#path(executor: "jev" | "luna", key: string) {
		return join(
			this.#options.directory,
			executor,
			key.slice(0, 2),
			`${key}.json`,
		);
	}

	/** jev for one attempt at `goldCase`, at `repetition`. */
	jev(goldCase: GrammarCase, repetition: number): JevAsk {
		return async (request: JevRequest, context) => {
			const body = {
				model: request.model,
				state: request.state,
				questions: request.questions,
			};
			const keyOf = (at: number) => sha256({ ...body, repetition: at });
			const path = this.#path("jev", keyOf(repetition));
			const hit = await readEntry<JevResponse>(path);
			if (hit) {
				this.spend.jev.cachedCalls++;
				return hit;
			}
			const { mode } = this.#options;
			if (mode === "project") {
				const other = await this.#otherRepetition<JevResponse>(
					"jev",
					keyOf,
					repetition,
				);
				this.projection.jev.requests++;
				if (other) {
					this.projection.jev.pricedFromCache++;
					this.projection.jev.inputTokens += other.usage.input_tokens;
					return other;
				}
				this.projection.jev.inputTokens += Math.ceil(
					stableJson({ state: body.state, questions: body.questions })
						.length / jevCharsPerToken,
				);
				return {
					model: request.model,
					answers: goldAnswers(goldCase, request.questions),
					usage: { input_tokens: 0, output_tokens: 0 },
				};
			}
			if (mode === "offline" || !this.#options.jev)
				throw Error(
					`jev cache miss in offline mode (${context.stage})`,
				);
			this.#options.beforeSpend?.();
			const response = await this.#options.jev(request, context);
			this.spend.jev.freshCalls++;
			this.spend.jev.freshInputTokens += response.usage.input_tokens;
			this.spend.jev.freshOutputTokens += response.usage.output_tokens;
			await writeEntry(path, response);
			return response;
		};
	}

	/** Luna for one attempt at `goldCase`, at `repetition`. */
	luna(goldCase: GrammarCase, repetition: number): LunaAsk {
		return async (request: LunaRequest, context) => {
			const keyOf = (at: number) =>
				sha256({ ...request, repetition: at });
			const path = this.#path("luna", keyOf(repetition));
			const hit = await readEntry<LunaResponse>(path);
			if (hit) {
				this.spend.luna.cachedCalls++;
				return hit;
			}
			const { mode } = this.#options;
			if (mode === "project") {
				const other = await this.#otherRepetition<LunaResponse>(
					"luna",
					keyOf,
					repetition,
				);
				this.projection.luna.requests++;
				if (other) {
					const tokens = lunaTokens(other.metadata);
					this.projection.luna.pricedFromCache++;
					this.projection.luna.inputTokens += tokens.inputTokens;
					this.projection.luna.outputTokens += tokens.outputTokens;
					return other;
				}
				const output = goldWritten(goldCase, request.input);
				this.projection.luna.inputTokens += Math.ceil(
					(request.systemPrompt.length +
						stableJson(request.input).length +
						stableJson(request.outputSchema ?? {}).length) /
						lunaCharsPerToken,
				);
				this.projection.luna.outputTokens += Math.ceil(
					stableJson({ value: output }).length / lunaCharsPerToken,
				);
				return { output };
			}
			if (mode === "offline" || !this.#options.luna)
				throw Error(
					`Luna cache miss in offline mode (${context.stage})`,
				);
			this.#options.beforeSpend?.();
			const response = await this.#options.luna(request, context);
			const tokens = lunaTokens(response.metadata);
			this.spend.luna.freshCalls++;
			this.spend.luna.freshInputTokens += tokens.inputTokens;
			this.spend.luna.freshOutputTokens += tokens.outputTokens;
			await writeEntry(path, response);
			return response;
		};
	}

	/** The same request answered at another repetition, for pricing. */
	async #otherRepetition<T>(
		executor: "jev" | "luna",
		keyOf: (repetition: number) => string,
		repetition: number,
	): Promise<T | undefined> {
		for (const at of [0, 1, 2]) {
			if (at === repetition) continue;
			const other = await readEntry<T>(this.#path(executor, keyOf(at)));
			if (other) return other;
		}
		return undefined;
	}
}
