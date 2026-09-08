import { recordTrace } from "common-utils/workflow";
import * as Effect from "effect/Effect";
import type {
	ModelGenerator,
	StructuredOutputSchema,
	StructuredSchemaOutput,
} from "./ai-sdk";
import { AiSdkGenerationError } from "./ai-sdk-generation-error";
import {
	createGenerationFailure,
	type GenerationEvent,
	type GenerationFailure,
} from "./model-generation";
import {
	assertResponseCompleted,
	createCommonRequest,
	createResponseError,
	DEFAULT_MAX_OUTPUT_TOKENS,
	exhaustedOutputTokenBudget,
	extractOutputText,
	type GenerationParams,
	RESPONSE_SCHEMA_NAME,
	type ResponseFailureMetadata,
	STRUCTURED_OUTPUT_RETRY_MIN_TOKENS,
	validateMaxOutputTokens,
} from "./openai-responses";

type Fetch = (
	input: string | URL | Request,
	init?: RequestInit,
) => Promise<Response>;
type OpenAiResponse = ResponseFailureMetadata & {
	readonly output?: readonly unknown[];
};
type OpenAiResponseResult = {
	readonly attempts: number;
	readonly providerRequestId?: string;
	readonly response: OpenAiResponse;
};
type JsonSchemaOverrideContext = {
	readonly jsonSchema: Record<string, unknown>;
	readonly zodSchema: {
		readonly _zod: { readonly def: { readonly type?: string } };
	};
};
const MAX_LOCAL_RETRY_DELAY_MS = 60_000;

export type BuildOpenAiFetchModelGeneratorOptions = {
	readonly apiKey?: string;
	readonly baseUrl?: string;
	readonly fetch?: Fetch;
	readonly maxOutputTokens?: number;
	readonly maxTransportAttempts?: number;
	readonly model?: string;
	readonly random?: () => number;
	readonly sleep?: (delayMs: number) => Effect.Effect<void>;
};

/** A cancellable, retrying OpenAI Responses transport. */
export function buildOpenAiFetchModelGenerator(
	options: BuildOpenAiFetchModelGeneratorOptions = {},
): ModelGenerator {
	const defaultMaxOutputTokens =
		options.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS;
	validateMaxOutputTokens(defaultMaxOutputTokens);
	const fetch = options.fetch ?? globalThis.fetch;
	const maxTransportAttempts = options.maxTransportAttempts ?? 3;
	if (
		!Number.isSafeInteger(maxTransportAttempts) ||
		maxTransportAttempts < 1 ||
		maxTransportAttempts > 10
	)
		throw new TypeError(
			"maxTransportAttempts must be a safe integer between 1 and 10.",
		);
	const random = options.random ?? Math.random;
	const endpoint = `${(options.baseUrl ?? "https://api.openai.com/v1").replace(/\/$/, "")}/responses`;
	const event = (value: GenerationEvent) =>
		recordTrace("model.generation.event", value);
	const scheduleRetry = (attempt: number, retryAfterMs?: number) => {
		const delayMs = retryDelayMs(attempt, retryAfterMs, random);
		return event({
			kind: "RetryScheduled",
			attempt: attempt + 1,
			delayMs,
		}).pipe(
			Effect.zipRight(options.sleep?.(delayMs) ?? Effect.sleep(delayMs)),
		);
	};

	const request = (
		body: unknown,
		firstAttempt = 1,
		lastAttempt = maxTransportAttempts,
	): Effect.Effect<OpenAiResponseResult, AiSdkGenerationError> =>
		Effect.suspend(() => {
			const activeRequests = new Set<AbortController>();
			return Effect.gen(function* () {
				const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
				if (!apiKey)
					return yield* Effect.fail(
						new AiSdkGenerationError(
							"provider-error",
							"OPENAI_API_KEY is not configured.",
							{
								failure: createGenerationFailure({
									attempts: 0,
									category: "RequestRejected",
								}),
							},
						),
					);
				const model = modelFromBody(body);
				for (
					let attempt = firstAttempt;
					attempt <= lastAttempt;
					attempt += 1
				) {
					yield* event({ kind: "AttemptStarted", attempt, model });
					const startedAt = Date.now();
					const controller = new AbortController();
					activeRequests.add(controller);
					const responseResult = yield* Effect.tryPromise({
						try: () =>
							fetch(endpoint, {
								body: JSON.stringify(body),
								headers: {
									Authorization: `Bearer ${apiKey}`,
									"Content-Type": "application/json",
								},
								method: "POST",
								signal: controller.signal,
							}),
						catch: () =>
							new AiSdkGenerationError(
								"provider-error",
								"OpenAI request failed.",
								{
									failure: createGenerationFailure({
										attempts: attempt,
										category: "Network",
									}),
								},
							),
					}).pipe(Effect.either);
					if (responseResult._tag === "Left") {
						activeRequests.delete(controller);
						yield* event({
							kind: "AttemptFailed",
							failure: responseResult.left.failure,
						});
						if (attempt === lastAttempt)
							return yield* Effect.fail(responseResult.left);
						yield* scheduleRetry(attempt);
						continue;
					}
					const response = responseResult.right;
					const providerRequestId = extractProviderRequestId(
						response.headers,
					);
					if (!response.ok) {
						const providerCode = yield* Effect.promise(() =>
							extractProviderCode(response),
						);
						const retryAfterMs = parseRetryAfterMs(
							response.headers.get("retry-after") ?? undefined,
						);
						const failure = classifyHttpFailure({
							attempts: attempt,
							providerCode,
							providerRequestId,
							retryAfterMs,
							status: response.status,
						});
						yield* event({ kind: "AttemptFailed", failure });
						activeRequests.delete(controller);
						if (
							!failure.retryable ||
							attempt === lastAttempt ||
							(retryAfterMs !== undefined &&
								retryAfterMs > MAX_LOCAL_RETRY_DELAY_MS)
						)
							return yield* Effect.fail(generationError(failure));
						yield* scheduleRetry(attempt, retryAfterMs);
						continue;
					}
					const parsedResult = yield* Effect.tryPromise({
						try: () => response.json() as Promise<OpenAiResponse>,
						catch: () =>
							new AiSdkGenerationError(
								"provider-error",
								"OpenAI returned invalid JSON.",
								{
									failure: createGenerationFailure({
										attempts: attempt,
										category: "InvalidOutput",
										...(providerRequestId
											? { providerRequestId }
											: {}),
									}),
								},
							),
					}).pipe(Effect.either);
					if (parsedResult._tag === "Left") {
						activeRequests.delete(controller);
						yield* event({
							kind: "AttemptFailed",
							failure: parsedResult.left.failure,
						});
						return yield* Effect.fail(parsedResult.left);
					}
					activeRequests.delete(controller);
					yield* event({
						kind: "Succeeded",
						attempt,
						latencyMs: Date.now() - startedAt,
						...(providerRequestId ? { providerRequestId } : {}),
					});
					return {
						attempts: attempt,
						providerRequestId,
						response: parsedResult.right,
					};
				}
				return yield* Effect.dieMessage(
					"OpenAI transport retry loop exhausted.",
				);
			}).pipe(
				Effect.onInterrupt(() =>
					Effect.sync(() => {
						for (const controller of activeRequests)
							controller.abort();
						activeRequests.clear();
					}),
				),
			);
		});

	return Object.freeze({
		structuredGeneration<OutputSchema extends StructuredOutputSchema>(
			input: string,
			outputSchema: OutputSchema,
			params: GenerationParams = {},
		) {
			return Effect.gen(function* () {
				let maxOutputTokens =
					params.maxOutputTokens ?? defaultMaxOutputTokens;
				let nextAttempt = 1;
				for (;;) {
					const requestBody = yield* createCommonRequest({
						defaultMaxOutputTokens,
						defaultModel: options.model,
						input,
						params: { ...params, maxOutputTokens },
					});
					const result = yield* request(
						{
							...requestBody,
							text: {
								format: {
									name: RESPONSE_SCHEMA_NAME,
									schema: outputSchema.toJSONSchema({
										target: "draft-7",
										override: ({
											zodSchema,
											jsonSchema,
										}: JsonSchemaOverrideContext) => {
											const definition =
												zodSchema._zod.def;
											if (
												definition.type === "union" &&
												"discriminator" in definition &&
												Array.isArray(jsonSchema.oneOf)
											) {
												jsonSchema.anyOf =
													jsonSchema.oneOf;
												delete jsonSchema.oneOf;
											}
										},
									}),
									strict: true,
									type: "json_schema",
								},
								verbosity: "low",
							},
						},
						nextAttempt,
						maxTransportAttempts,
					);
					nextAttempt = result.attempts + 1;
					if (
						nextAttempt <= maxTransportAttempts &&
						exhaustedOutputTokenBudget(result.response)
					) {
						maxOutputTokens = Math.max(
							STRUCTURED_OUTPUT_RETRY_MIN_TOKENS,
							maxOutputTokens * 2,
						);
						validateMaxOutputTokens(maxOutputTokens);
						continue;
					}
					return yield* parseStructured(result, outputSchema);
				}
			});
		},
		unstructuredGeneration(input: string, params: GenerationParams = {}) {
			return Effect.gen(function* () {
				const requestBody = yield* createCommonRequest({
					defaultMaxOutputTokens,
					defaultModel: options.model,
					input,
					params,
				});
				const result = yield* request(requestBody);
				try {
					assertResponseCompleted(result.response);
				} catch {
					return yield* Effect.fail(responseError(result));
				}
				const text = extractOutputText(result.response.output);
				return text ? text : yield* Effect.fail(responseError(result));
			});
		},
	});
}

function parseStructured<OutputSchema extends StructuredOutputSchema>(
	result: OpenAiResponseResult,
	schema: OutputSchema,
): Effect.Effect<StructuredSchemaOutput<OutputSchema>, AiSdkGenerationError> {
	try {
		assertResponseCompleted(result.response);
		const text = extractOutputText(result.response.output);
		if (!text) return Effect.fail(responseError(result));
		return Effect.try({
			try: () =>
				schema.parse(
					JSON.parse(text),
				) as StructuredSchemaOutput<OutputSchema>,
			catch: () => invalidOutputError(result),
		});
	} catch {
		return Effect.fail(responseError(result));
	}
}
function responseError(result: OpenAiResponseResult): AiSdkGenerationError {
	return createResponseError(result.response, {
		attempts: result.attempts,
		providerRequestId: result.providerRequestId,
	});
}
function invalidOutputError(
	result: OpenAiResponseResult,
): AiSdkGenerationError {
	return new AiSdkGenerationError(
		"provider-error",
		"OpenAI returned output that did not match the requested schema.",
		{
			failure: createGenerationFailure({
				attempts: result.attempts,
				category: "InvalidOutput",
				...(result.providerRequestId
					? { providerRequestId: result.providerRequestId }
					: {}),
			}),
		},
	);
}
function classifyHttpFailure(input: {
	readonly attempts: number;
	readonly providerCode?: string;
	readonly providerRequestId?: string;
	readonly retryAfterMs?: number;
	readonly status: number;
}): GenerationFailure {
	return createGenerationFailure({
		attempts: input.attempts,
		category:
			input.status === 429
				? "RateLimited"
				: input.status >= 500
					? "ProviderUnavailable"
					: "RequestRejected",
		...(input.providerCode ? { providerCode: input.providerCode } : {}),
		...(input.providerRequestId
			? { providerRequestId: input.providerRequestId }
			: {}),
		...(input.retryAfterMs === undefined
			? {}
			: { retryAfterMs: input.retryAfterMs }),
		status: input.status,
	});
}
function generationError(failure: GenerationFailure): AiSdkGenerationError {
	return new AiSdkGenerationError(
		"provider-error",
		`OpenAI request failed (${failure.status ?? failure.category}).`,
		{ failure },
	);
}
async function extractProviderCode(
	response: Response,
): Promise<string | undefined> {
	try {
		const body = (await response.json()) as unknown;
		return isRecord(body) && isRecord(body.error)
			? safeMetadataString(body.error.code)
			: undefined;
	} catch {
		return undefined;
	}
}
function extractProviderRequestId(headers: Headers): string | undefined {
	for (const name of ["x-request-id", "request-id", "openai-request-id"]) {
		const value = safeMetadataString(headers.get(name));
		if (value) return value;
	}
	return undefined;
}
function safeMetadataString(value: unknown): string | undefined {
	return typeof value === "string" && value.length > 0 && value.length <= 200
		? value
		: undefined;
}
function retryDelayMs(
	attempt: number,
	retryAfterMs: number | undefined,
	random: () => number,
): number {
	if (retryAfterMs !== undefined) return retryAfterMs;
	return Math.round(
		Math.min(8_000, 250 * 2 ** (attempt - 1)) *
			(1 + Math.max(0, Math.min(1, random()))),
	);
}
function parseRetryAfterMs(value: string | undefined): number | undefined {
	if (!value) return undefined;
	const seconds = Number(value);
	if (Number.isFinite(seconds) && seconds >= 0) {
		const milliseconds = Math.round(seconds * 1_000);
		return Number.isSafeInteger(milliseconds) ? milliseconds : undefined;
	}
	const date = Date.parse(value);
	return Number.isFinite(date) ? Math.max(0, date - Date.now()) : undefined;
}
function modelFromBody(body: unknown): string {
	return isRecord(body) && typeof body.model === "string"
		? body.model
		: "unknown";
}
function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
