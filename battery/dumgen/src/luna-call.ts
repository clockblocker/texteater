/**
 * How every operation reaches Luna: the `Luna` service, built from the
 * host's `LunaTransport`, the `RequestBudget` and the `LunaConfiguration`.
 * One request, its output checked before it is used, its tokens read from
 * what the transport reports (OpenAI's `usage`, as `createOpenAILuna`
 * returns it).
 */
import { isRecord } from "common-utils";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
	type CallLog,
	type CallTokens,
	callContext,
	callModel,
	RequestBudget,
} from "./call.js";
import { InvalidModelOutput, type ProviderFailure } from "./errors.js";
import {
	type LunaAsk,
	LunaConfiguration,
	type LunaDraft,
	type LunaRequest,
} from "./luna.js";

/** The host's Luna transport, a Promise port taking a signal: `createOpenAILuna` in production. */
export class LunaTransport extends Context.Service<
	LunaTransport,
	{ readonly ask: LunaAsk }
>()("dumgen/LunaTransport") {}

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

/** The output a check makes of Luna's, or why it cannot be used. */
type Check<Output> = (output: unknown) => Output | InvalidModelOutput;

/**
 * Luna as the operations reach it: one request under the request budget,
 * its output checked. A transport that kept no output says why (a refusal,
 * JSON without its value); that reason is the refusal's.
 */
export class Luna extends Context.Service<
	Luna,
	{
		readonly ask: <Output>(
			stage: string,
			draft: LunaDraft,
			check: Check<Output>,
		) => Effect.Effect<
			Output,
			ProviderFailure | InvalidModelOutput,
			CallLog
		>;
	}
>()("dumgen/Luna") {
	static readonly layer = Layer.effect(
		Luna,
		Effect.gen(function* () {
			const transport = yield* LunaTransport;
			const budget = yield* RequestBudget;
			const configuration = yield* LunaConfiguration;
			return Luna.of({
				ask: (stage, draft, check) => {
					const request: LunaRequest = { ...draft, configuration };
					return callModel(budget, {
						stage,
						executor: "luna",
						request,
						send: (signal) =>
							transport.ask(request, { stage, signal }),
						tokens: (response) => lunaTokens(response.metadata),
						check: (response) => {
							const problem = isRecord(response.metadata)
								? response.metadata.problem
								: undefined;
							return response.output === undefined &&
								typeof problem === "string"
								? new InvalidModelOutput({
										stage,
										message: problem,
									})
								: check(response.output);
						},
					});
				},
			});
		}),
	);
}

/** Sends one Luna request under the request budget and checks its output. */
export const askLuna = <Output>(
	stage: string,
	draft: LunaDraft,
	check: Check<Output>,
): Effect.Effect<
	Output,
	ProviderFailure | InvalidModelOutput,
	Luna | CallLog
> => Luna.use((luna) => luna.ask(stage, draft, check));

/** `Luna`'s ask carrying the running operation's CallLog, for helpers that read no services. */
export type Write = <Output>(
	stage: string,
	draft: LunaDraft,
	check: Check<Output>,
) => Effect.Effect<Output, ProviderFailure | InvalidModelOutput>;

/** The running operation's `Write`, as `stageAsk` is its `Ask`. */
export const stageWrite: Effect.Effect<Write, never, Luna | CallLog> =
	Effect.gen(function* () {
		const luna = yield* Luna;
		const context = yield* callContext;
		return (stage, draft, check) =>
			luna.ask(stage, draft, check).pipe(Effect.provideContext(context));
	});
