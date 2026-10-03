/**
 * How an operation reaches Luna through the call adapter: one request, its
 * output checked before it is used, its tokens read from what the
 * transport reports (OpenAI's `usage`, as `createOpenAILuna` returns it).
 */
import type * as Effect from "effect/Effect";
import type { OperationScope } from "./call.js";
import { InvalidModelOutput, type ProviderFailure } from "./errors.js";
import type { LunaAsk, LunaConfiguration, LunaRequest } from "./luna.js";

/** What an operation reaches Luna with: the host's transport and the configuration. */
export type LunaSettings = {
	readonly ask: LunaAsk;
	readonly configuration: LunaConfiguration;
};

const tokenCount = (value: unknown) =>
	typeof value === "number" && Number.isFinite(value) ? value : 0;

/** The tokens a Luna response reports in its metadata's `usage`, zero when it reports none. */
export function lunaTokens(metadata: unknown): {
	readonly inputTokens: number;
	readonly outputTokens: number;
} {
	const usage = (metadata as { usage?: Record<string, unknown> } | null)
		?.usage;
	return {
		inputTokens: tokenCount(usage?.input_tokens),
		outputTokens: tokenCount(usage?.output_tokens),
	};
}

/** Sends one Luna request under the request budget and checks its output. */
export function askLuna<Output>(
	scope: OperationScope,
	luna: LunaSettings,
	stage: string,
	request: Omit<LunaRequest, "configuration">,
	check: (output: unknown) => Output | InvalidModelOutput,
): Effect.Effect<Output, ProviderFailure | InvalidModelOutput> {
	const sent = {
		...request,
		configuration: luna.configuration,
	} as LunaRequest;
	return scope.call({
		stage,
		executor: "luna",
		request: sent,
		send: (signal) => luna.ask(sent, { stage, signal }),
		tokens: (response) => lunaTokens(response.metadata),
		check: (response) => {
			// A transport that kept no output says why (a refusal, JSON
			// without its value); that reason is the refusal's.
			const problem = (
				response.metadata as { problem?: unknown } | undefined
			)?.problem;
			return response.output === undefined && typeof problem === "string"
				? new InvalidModelOutput({ stage, message: problem })
				: check(response.output);
		},
	});
}
