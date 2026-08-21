import type {
	AiSdk,
	StructuredOutputSchema,
	StructuredSchemaOutput,
} from "./ai-sdk";
import { AiSdkGenerationError } from "./ai-sdk-generation-error";
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

type JsonSchemaOverrideContext = {
	readonly jsonSchema: Record<string, unknown>;
	readonly zodSchema: {
		readonly _zod: { readonly def: { readonly type?: string } };
	};
};

export type BuildOpenAiFetchSdkOptions = {
	/** Defaults to OPENAI_API_KEY. */
	readonly apiKey?: string;
	readonly baseUrl?: string;
	readonly fetch?: Fetch;
	readonly maxOutputTokens?: number;
	readonly model?: string;
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
	const endpoint = `${(options.baseUrl ?? "https://api.openai.com/v1").replace(/\/$/, "")}/responses`;

	async function request(body: unknown): Promise<OpenAiResponse> {
		const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
		if (!apiKey) {
			throw new AiSdkGenerationError(
				"provider-error",
				"OPENAI_API_KEY is not configured.",
			);
		}
		const response = await fetch(endpoint, {
			body: JSON.stringify(body),
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			},
			method: "POST",
		});
		if (!response.ok) {
			throw new AiSdkGenerationError(
				"provider-error",
				`OpenAI request failed (${response.status} ${response.statusText}).`,
			);
		}
		return (await response.json()) as OpenAiResponse;
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
				const response = await request({
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

				if (attempt === 0 && exhaustedOutputTokenBudget(response)) {
					maxOutputTokens = Math.max(
						STRUCTURED_OUTPUT_RETRY_MIN_TOKENS,
						maxOutputTokens * 2,
					);
					validateMaxOutputTokens(maxOutputTokens);
					continue;
				}
				assertResponseCompleted(response);
				const text = extractOutputText(response.output);
				if (!text) throw createResponseError(response);
				return outputSchema.parse(
					JSON.parse(text),
				) as StructuredSchemaOutput<OutputSchema>;
			}
			throw new Error("Structured generation retry loop exhausted.");
		},

		async unstructuredGeneration(
			input: string,
			params: GenerationParams = {},
		): Promise<string> {
			const response = await request(
				await createCommonRequest({
					defaultMaxOutputTokens,
					defaultModel: options.model,
					input,
					params,
				}),
			);
			assertResponseCompleted(response);
			const text = extractOutputText(response.output);
			if (!text) throw createResponseError(response);
			return text;
		},
	});
}
