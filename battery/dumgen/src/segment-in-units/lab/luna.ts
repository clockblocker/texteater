/**
 * The lab's Luna client: one structured-output Responses call, cached on
 * disk by (model, settings, prompt, input, schema, repetition) like jev, with
 * its usage recorded for the ledger.
 */
import { join } from "node:path";
import type { EvaluationExecutor } from "promptsmith/evaluation";
import { createOpenAIExecutor } from "promptsmith/openai";
import {
	type CallRecord,
	hashOf,
	readCache,
	Semaphore,
	writeCache,
} from "./jev.js";

/** Dumgen's generation default (`src/universal/model-configuration.ts`). */
export const lunaConfiguration = {
	model: "gpt-5.6-luna",
	settings: { reasoning: { effort: "none" }, service_tier: "fast" },
} as const;

type Cached = {
	readonly output: unknown;
	readonly usage: {
		readonly inputTokens: number;
		readonly outputTokens: number;
		readonly cachedTokens: number;
	};
	readonly latencyMs: number;
};

type OpenAIUsage = {
	readonly input_tokens?: number;
	readonly output_tokens?: number;
	readonly input_tokens_details?: { readonly cached_tokens?: number };
};

export class Luna {
	readonly #cacheDirectory: string;
	readonly #semaphore: Semaphore;
	readonly #beforeSpend: (() => void) | undefined;
	readonly #offline: boolean;
	#executor: EvaluationExecutor | undefined;
	constructor(options: {
		readonly cacheDirectory: string;
		readonly concurrency?: number;
		readonly beforeSpend?: () => void;
		readonly offline?: boolean;
		readonly executor?: EvaluationExecutor;
	}) {
		this.#cacheDirectory = options.cacheDirectory;
		this.#semaphore = new Semaphore(options.concurrency ?? 6);
		this.#beforeSpend = options.beforeSpend;
		this.#offline = options.offline ?? false;
		this.#executor = options.executor;
	}

	async generate(args: {
		readonly stage: string;
		readonly systemPrompt: string;
		readonly input: unknown;
		readonly outputSchema: Readonly<Record<string, unknown>>;
		readonly repetition: number;
		readonly calls: CallRecord[];
		/** Reasoning effort; Dumgen's default is none. */
		readonly effort?: string;
		/** Explicit bounds for a new experiment; historical calls retain their defaults. */
		readonly maxRetries?: number;
		readonly maxOutputTokens?: number;
		readonly timeoutMs?: number;
	}): Promise<unknown> {
		for (const [name, value, minimum] of [
			["maxRetries", args.maxRetries, 0],
			["maxOutputTokens", args.maxOutputTokens, 1],
			["timeoutMs", args.timeoutMs, 1],
		] as const)
			if (value !== undefined && (!Number.isSafeInteger(value) || value < minimum))
				throw Error(`Invalid Luna ${name}`);
		const settings = {
			...lunaConfiguration.settings,
			reasoning: { effort: args.effort ?? "none" },
			...(args.maxOutputTokens === undefined ? {} : { max_output_tokens: args.maxOutputTokens }),
		};
		const key = hashOf({
			configuration:
				(args.effort === undefined || args.effort === "none") && args.maxOutputTokens === undefined
					? lunaConfiguration
					: { model: lunaConfiguration.model, settings },
			systemPrompt: args.systemPrompt,
			input: args.input,
			outputSchema: args.outputSchema,
			repetition: args.repetition,
		});
		const path = join(
			this.#cacheDirectory,
			"luna",
			key.slice(0, 2),
			`${key}.json`,
		);
		const hit = await readCache<Cached>(path);
		const record = (value: Cached, cached: boolean) =>
			args.calls.push({
				executor: "luna",
				stage: args.stage,
				questions: 1,
				inputTokens: value.usage.inputTokens,
				outputTokens: value.usage.outputTokens,
				latencyMs: value.latencyMs,
				cached,
			});
		if (hit) {
			record(hit, true);
			return hit.output;
		}
		if (this.#offline)
			throw Error(`Luna cache miss in offline mode (${args.stage})`);
		const value = await this.#semaphore.use(async () => {
			this.#beforeSpend?.();
			this.#executor ??= createOpenAIExecutor();
			for (let attempt = 0; ; attempt++) {
				const started = performance.now();
				try {
					const response = await this.#executor({
						systemPrompt: args.systemPrompt,
						input: args.input,
						outputSchema: args.outputSchema,
						cachePrompt: true,
						configuration: {
							model: lunaConfiguration.model,
							settings,
						},
						...(args.timeoutMs === undefined ? {} : { signal: AbortSignal.timeout(args.timeoutMs) }),
					});
					const usage = ((
						response.metadata as { usage?: OpenAIUsage } | undefined
					)?.usage ?? {}) as OpenAIUsage;
					return {
						output: response.output,
						usage: {
							inputTokens: usage.input_tokens ?? 0,
							outputTokens: usage.output_tokens ?? 0,
							cachedTokens:
								usage.input_tokens_details?.cached_tokens ?? 0,
						},
						latencyMs: performance.now() - started,
					} satisfies Cached;
				} catch (error) {
					const message =
						error instanceof Error ? error.message : String(error);
					const retryable =
						/HTTP (429|5\d\d)|fetch failed|ECONNRESET|timeout/iu.test(
							message,
						);
					if (!retryable || attempt >= (args.maxRetries ?? 5)) {
						args.calls.push({
							executor: "luna",
							stage: args.stage,
							questions: 1,
							inputTokens: 0,
							outputTokens: 0,
							latencyMs: performance.now() - started,
							cached: false,
							error: message,
						});
						throw error;
					}
					await new Promise((resolve) =>
						setTimeout(resolve, 2000 * 2 ** attempt),
					);
				}
			}
		});
		await writeCache(path, value);
		record(value, false);
		return value.output;
	}
}
