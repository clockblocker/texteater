import { createHash } from "node:crypto";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { output, ZodType } from "zod";

import { AiSdkGenerationError } from "./ai-sdk-generation-error";

const GPT_5_NANO_MODEL = "gpt-5-nano";

const DEFAULT_MAX_OUTPUT_TOKENS = 256;
const RESPONSE_SCHEMA_NAME = "dumgen_response";
const STRUCTURED_OUTPUT_RETRY_MIN_TOKENS = 1024;

type GenerationParams = {
	readonly maxOutputTokens?: number;
	readonly model?: string;
	readonly systemPrompt?: string;
};

type BuildOpenAiSdkOptions = {
	/**
	 * Defaults to OPENAI_API_KEY through the OpenAI SDK.
	 */
	readonly apiKey?: string;
	readonly client?: OpenAI;
	readonly maxOutputTokens?: number;
	readonly model?: string;
};

/**
 * Creates a server-side AiSdk backed by the OpenAI Responses API.
 *
 * Keep the returned adapter and its API key out of browser bundles.
 */
export function buildOpenAiSdk(options: BuildOpenAiSdkOptions = {}) {
	const defaultModel = options.model ?? GPT_5_NANO_MODEL;
	const defaultMaxOutputTokens =
		options.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS;
	validateMaxOutputTokens(defaultMaxOutputTokens);

	let client = options.client;
	const getClient = () => {
		client ??= new OpenAI({ apiKey: options.apiKey });
		return client;
	};

	return Object.freeze({
		async structuredGeneration<OutputSchema extends ZodType>(
			input: string,
			outputSchema: OutputSchema,
			params: GenerationParams = {},
		): Promise<output<OutputSchema>> {
			let maxOutputTokens =
				params.maxOutputTokens ?? defaultMaxOutputTokens;
			for (let attempt = 0; attempt < 2; attempt += 1) {
				const response = await getClient().responses.parse({
					...createCommonRequest({
						defaultMaxOutputTokens,
						defaultModel,
						input,
						params: { ...params, maxOutputTokens },
					}),
					text: {
						format: zodTextFormat(
							outputSchema,
							RESPONSE_SCHEMA_NAME,
						),
						verbosity: "low",
					},
				});

				if (attempt === 0 && exhaustedOutputTokenBudget(response)) {
					maxOutputTokens = Math.max(
						STRUCTURED_OUTPUT_RETRY_MIN_TOKENS,
						maxOutputTokens * 2,
					);
					validateMaxOutputTokens(maxOutputTokens);
					continue;
				}
				assertResponseCompleted(response);
				if (response.output_parsed === null) {
					throw createResponseError(response);
				}

				return response.output_parsed as output<OutputSchema>;
			}
			throw new Error("Structured generation retry loop exhausted.");
		},

		async unstructuredGeneration(
			input: string,
			params: GenerationParams = {},
		): Promise<string> {
			const response = await getClient().responses.create(
				createCommonRequest({
					defaultMaxOutputTokens,
					defaultModel,
					input,
					params,
				}),
			);

			assertResponseCompleted(response);
			if (!response.output_text) {
				throw createResponseError(response);
			}

			return response.output_text;
		},
	});
}

function createCommonRequest(args: {
	readonly defaultMaxOutputTokens: number;
	readonly defaultModel: string;
	readonly input: string;
	readonly params: GenerationParams;
}) {
	const maxOutputTokens =
		args.params.maxOutputTokens ?? args.defaultMaxOutputTokens;
	validateMaxOutputTokens(maxOutputTokens);

	const systemPrompt = args.params.systemPrompt;
	const input = systemPrompt
		? [
				{
					role: "system" as const,
					content: systemPrompt,
				},
				{
					role: "user" as const,
					content: args.input,
				},
			]
		: args.input;

	return {
		model: args.params.model ?? args.defaultModel,
		input,
		max_output_tokens: maxOutputTokens,
		...(systemPrompt
			? { prompt_cache_key: hashString(systemPrompt) }
			: undefined),
		reasoning: {
			effort: "minimal" as const,
		},
		store: false,
		text: {
			verbosity: "low" as const,
		},
	};
}

function validateMaxOutputTokens(maxOutputTokens: number): void {
	if (!Number.isSafeInteger(maxOutputTokens) || maxOutputTokens < 1) {
		throw new TypeError("maxOutputTokens must be a positive safe integer.");
	}
}

function hashString(value: string): string {
	return createHash("sha256").update(value).digest("hex");
}

type ResponseFailureMetadata = {
	readonly incomplete_details?: { readonly reason?: string } | null;
	readonly output?: readonly unknown[];
	readonly status?: string;
};

function exhaustedOutputTokenBudget(
	response: ResponseFailureMetadata,
): boolean {
	return (
		response.status === "incomplete" &&
		response.incomplete_details?.reason === "max_output_tokens"
	);
}

function assertResponseCompleted(response: ResponseFailureMetadata): void {
	if (response.status !== undefined && response.status !== "completed") {
		throw createResponseError(response);
	}
}

function createResponseError(
	response: ResponseFailureMetadata,
): AiSdkGenerationError {
	const refusal = findRefusal(response.output);
	if (refusal) {
		return new AiSdkGenerationError(
			"refusal",
			`OpenAI refused the request: ${refusal}`,
		);
	}

	const detail = response.incomplete_details?.reason ?? response.status;
	const reason =
		detail === "max_output_tokens"
			? "max-output-tokens"
			: detail === "content_filter"
				? "content-filter"
				: "provider-error";
	return new AiSdkGenerationError(
		reason,
		detail
			? `OpenAI returned no usable output (${detail}).`
			: "OpenAI returned no usable output.",
	);
}

function findRefusal(
	output: readonly unknown[] | undefined,
): string | undefined {
	if (!output) return undefined;

	for (const item of output) {
		if (!isRecord(item) || !Array.isArray(item.content)) continue;
		for (const content of item.content) {
			if (
				isRecord(content) &&
				content.type === "refusal" &&
				typeof content.refusal === "string"
			) {
				return content.refusal;
			}
		}
	}

	return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
