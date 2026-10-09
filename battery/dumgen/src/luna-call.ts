/**
 * How an operation reaches Luna through the call adapter: one request, its
 * output checked before it is used, its tokens read from what the
 * transport reports (OpenAI's `usage`, as `createOpenAILuna` returns it).
 */
import { isRecord } from "common-utils";
import type * as Effect from "effect/Effect";
import type { CallTokens, OperationScope } from "./call.js";
import { InvalidModelOutput, type ProviderFailure } from "./errors.js";
import type {
	LunaAsk,
	LunaConfiguration,
	LunaDraft,
	LunaRequest,
} from "./luna.js";

/** What an operation reaches Luna with: the host's transport and the configuration. */
export type LunaSettings = {
	readonly ask: LunaAsk;
	readonly configuration: LunaConfiguration;
};

const tokenCount = (value: unknown) =>
	typeof value === "number" && Number.isFinite(value) ? value : 0;

/**
 * The tokens a Luna response reports in its metadata's `usage`, zero when
 * it reports none. `inputTokens` counts them all; of those, OpenAI's
 * `input_tokens_details` says how many were read from the prompt cache
 * (`cached_tokens`) and how many were written to it (`cache_write_tokens`).
 */
export function lunaTokens(metadata: unknown): CallTokens & {
	readonly cachedInputTokens: number;
	readonly cacheWriteTokens: number;
} {
	const usage =
		isRecord(metadata) && isRecord(metadata.usage)
			? metadata.usage
			: undefined;
	const details = isRecord(usage?.input_tokens_details)
		? usage.input_tokens_details
		: undefined;
	return {
		inputTokens: tokenCount(usage?.input_tokens),
		outputTokens: tokenCount(usage?.output_tokens),
		cachedInputTokens: tokenCount(details?.cached_tokens),
		cacheWriteTokens: tokenCount(details?.cache_write_tokens),
	};
}

/** Sends one Luna request under the request budget and checks its output. */
export function askLuna<Output>(
	scope: OperationScope,
	luna: LunaSettings,
	stage: string,
	request: LunaDraft,
	check: (output: unknown) => Output | InvalidModelOutput,
): Effect.Effect<Output, ProviderFailure | InvalidModelOutput> {
	const sent: LunaRequest = {
		...request,
		configuration: luna.configuration,
	};
	return scope.call({
		stage,
		executor: "luna",
		request: sent,
		send: (signal) => luna.ask(sent, { stage, signal }),
		tokens: (response) => lunaTokens(response.metadata),
		check: (response) => {
			// A transport that kept no output says why (a refusal, JSON
			// without its value); that reason is the refusal's.
			const problem = isRecord(response.metadata)
				? response.metadata.problem
				: undefined;
			return response.output === undefined && typeof problem === "string"
				? new InvalidModelOutput({ stage, message: problem })
				: check(response.output);
		},
	});
}
