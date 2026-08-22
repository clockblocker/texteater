import type {
	AiSdk,
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

export type BuildOpenAiFetchSdkOptions = {
	/** Defaults to OPENAI_API_KEY. */
	readonly apiKey?: string;
	readonly baseUrl?: string;
	readonly fetch?: Fetch;
	readonly maxOutputTokens?: number;
	readonly maxTransportAttempts?: number;
	readonly model?: string;
	readonly onGenerationEvent?: (event: GenerationEvent) => void;
	readonly random?: () => number;
	readonly sleep?: (delayMs: number) => Promise<void>;
};

/**
 * Creates a small OpenAI Responses adapter for constrained server runtimes.
 *
 * Unlike the default adapter, this transport does not load the OpenAI SDK.
 */
export function buildOpenAiFetchSdk(
	options: BuildOpenAiFetchSdkOptions = {},
): AiSdk {
	const defaultMaxOutputTokens =
		options.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS;
	validateMaxOutputTokens(defaultMaxOutputTokens);
	const fetch = options.fetch ?? globalThis.fetch;
	const maxTransportAttempts = options.maxTransportAttempts ?? 3;
	if (
		!Number.isSafeInteger(maxTransportAttempts) ||
		maxTransportAttempts < 1 ||
		maxTransportAttempts > 10
	) {
		throw new TypeError(
			"maxTransportAttempts must be a safe integer between 1 and 10.",
		);
	}
	const random = options.random ?? Math.random;
	const sleep = options.sleep ?? defaultSleep;
	const endpoint = `${(options.baseUrl ?? "https://api.openai.com/v1").replace(/\/$/, "")}/responses`;

	async function request(body: unknown): Promise<OpenAiResponseResult> {
		const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
		if (!apiKey) {
			throw new AiSdkGenerationError(
				"provider-error",
				"OPENAI_API_KEY is not configured.",
				{
					failure: createGenerationFailure({
						attempts: 0,
						category: "RequestRejected",
					}),
				},
			);
		}
		const model = modelFromBody(body);
		for (let attempt = 1; attempt <= maxTransportAttempts; attempt += 1) {
			options.onGenerationEvent?.({
				kind: "AttemptStarted",
				attempt,
				model,
			});
			const startedAt = Date.now();
			let response: Response;
			try {
				response = await fetch(endpoint, {
					body: JSON.stringify(body),
					headers: {
						Authorization: `Bearer ${apiKey}`,
						"Content-Type": "application/json",
					},
					method: "POST",
				});
			} catch {
				const failure = createGenerationFailure({
					attempts: attempt,
					category: "Network",
				});
				options.onGenerationEvent?.({
					kind: "AttemptFailed",
					failure,
				});
				if (attempt === maxTransportAttempts) {
					throw generationError(failure);
				}
				await scheduleRetry(attempt, undefined);
				continue;
			}

			const providerRequestId = extractProviderRequestId(
				response.headers,
			);
			if (!response.ok) {
				const providerCode = await extractProviderCode(response);
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
				options.onGenerationEvent?.({
					kind: "AttemptFailed",
					failure,
				});
				if (
					!failure.retryable ||
					attempt === maxTransportAttempts ||
					(retryAfterMs !== undefined &&
						retryAfterMs > MAX_LOCAL_RETRY_DELAY_MS)
				) {
					throw generationError(failure);
				}
				await scheduleRetry(attempt, retryAfterMs);
				continue;
			}

			let parsed: OpenAiResponse;
			try {
				parsed = (await response.json()) as OpenAiResponse;
			} catch {
				const failure = createGenerationFailure({
					attempts: attempt,
					category: "InvalidOutput",
					providerRequestId,
					status: response.status,
				});
				options.onGenerationEvent?.({
					kind: "AttemptFailed",
					failure,
				});
				throw generationError(failure);
			}
			options.onGenerationEvent?.({
				kind: "Succeeded",
				attempt,
				latencyMs: Date.now() - startedAt,
				...(providerRequestId ? { providerRequestId } : {}),
			});
			return {
				attempts: attempt,
				providerRequestId,
				response: parsed,
			};
		}
		throw new Error("OpenAI transport retry loop exhausted.");

		async function scheduleRetry(
			attempt: number,
			retryAfterMs: number | undefined,
		): Promise<void> {
			const delayMs = retryDelayMs(attempt, retryAfterMs, random);
			options.onGenerationEvent?.({
				kind: "RetryScheduled",
				attempt: attempt + 1,
				delayMs,
			});
			await sleep(delayMs);
		}
	}

	return Object.freeze({
		async structuredGeneration<OutputSchema extends StructuredOutputSchema>(
			input: string,
			outputSchema: OutputSchema,
			params: GenerationParams = {},
		): Promise<StructuredSchemaOutput<OutputSchema>> {
			let maxOutputTokens =
				params.maxOutputTokens ?? defaultMaxOutputTokens;
			for (let attempt = 0; attempt < 2; attempt += 1) {
				const result = await request({
					...(await createCommonRequest({
						defaultMaxOutputTokens,
						defaultModel: options.model,
						input,
						params: { ...params, maxOutputTokens },
					})),
					text: {
						format: {
							name: RESPONSE_SCHEMA_NAME,
							schema: outputSchema.toJSONSchema({
								target: "draft-7",
								override: ({
									zodSchema,
									jsonSchema,
								}: JsonSchemaOverrideContext) => {
									const definition = zodSchema._zod.def;
									if (
										definition.type === "union" &&
										"discriminator" in definition &&
										Array.isArray(jsonSchema.oneOf)
									) {
										jsonSchema.anyOf = jsonSchema.oneOf;
										delete jsonSchema.oneOf;
									}
								},
							}),
							strict: true,
							type: "json_schema",
						},
						verbosity: "low",
					},
				});

				if (
					attempt === 0 &&
					exhaustedOutputTokenBudget(result.response)
				) {
					maxOutputTokens = Math.max(
						STRUCTURED_OUTPUT_RETRY_MIN_TOKENS,
						maxOutputTokens * 2,
					);
					validateMaxOutputTokens(maxOutputTokens);
					continue;
				}
				assertResponseCompletedWithMetadata(result);
				const text = extractOutputText(result.response.output);
				if (!text) throw responseError(result);
				try {
					return outputSchema.parse(
						JSON.parse(text),
					) as StructuredSchemaOutput<OutputSchema>;
				} catch {
					throw invalidOutputError(result);
				}
			}
			throw new Error("Structured generation retry loop exhausted.");
		},

		async unstructuredGeneration(
			input: string,
			params: GenerationParams = {},
		): Promise<string> {
			const result = await request(
				await createCommonRequest({
					defaultMaxOutputTokens,
					defaultModel: options.model,
					input,
					params,
				}),
			);
			assertResponseCompletedWithMetadata(result);
			const text = extractOutputText(result.response.output);
			if (!text) throw responseError(result);
			return text;
		},
	});
}

function assertResponseCompletedWithMetadata(
	result: OpenAiResponseResult,
): void {
	try {
		assertResponseCompleted(result.response);
	} catch {
		throw responseError(result);
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
	const category =
		input.status === 429
			? "RateLimited"
			: input.status >= 500
				? "ProviderUnavailable"
				: "RequestRejected";
	return createGenerationFailure({
		attempts: input.attempts,
		category,
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
		if (!isRecord(body) || !isRecord(body.error)) return undefined;
		return safeMetadataString(body.error.code);
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
	const exponentialMs = Math.min(8_000, 250 * 2 ** (attempt - 1));
	return Math.round(exponentialMs * (1 + Math.max(0, Math.min(1, random()))));
}

function parseRetryAfterMs(value: string | undefined): number | undefined {
	if (!value) return undefined;
	const seconds = Number(value);
	if (Number.isFinite(seconds) && seconds >= 0) {
		const milliseconds = Math.round(seconds * 1_000);
		return Number.isSafeInteger(milliseconds) ? milliseconds : undefined;
	}
	const date = Date.parse(value);
	if (!Number.isFinite(date)) return undefined;
	return Math.max(0, date - Date.now());
}

function modelFromBody(body: unknown): string {
	return isRecord(body) && typeof body.model === "string"
		? body.model
		: "unknown";
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function defaultSleep(delayMs: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, delayMs));
}
