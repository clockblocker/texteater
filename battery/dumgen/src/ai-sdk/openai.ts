import type OpenAI from "openai";
import type { output, ZodType } from "zod";
import { DUMGEN_GENERATION_MODEL } from "./model-policy";
import {
	assertResponseCompleted,
	createCommonRequest,
	createResponseError,
	DEFAULT_MAX_OUTPUT_TOKENS,
	exhaustedOutputTokenBudget,
	type GenerationParams,
	RESPONSE_SCHEMA_NAME,
	STRUCTURED_OUTPUT_RETRY_MIN_TOKENS,
	validateMaxOutputTokens,
} from "./openai-responses";

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
	const defaultModel = options.model ?? DUMGEN_GENERATION_MODEL;
	const defaultMaxOutputTokens =
		options.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS;
	validateMaxOutputTokens(defaultMaxOutputTokens);

	let clientPromise: Promise<OpenAI> | undefined;
	const getClient = async () => {
		if (options.client) return options.client;
		clientPromise ??= import("openai").then(
			({ default: OpenAIClient }) =>
				new OpenAIClient({ apiKey: options.apiKey }),
		);
		return clientPromise;
	};

	return Object.freeze({
		async structuredGeneration<OutputSchema extends ZodType>(
			input: string,
			outputSchema: OutputSchema,
			params: GenerationParams = {},
		): Promise<output<OutputSchema>> {
			const [{ zodTextFormat }, client] = await Promise.all([
				import("openai/helpers/zod"),
				getClient(),
			]);
			let maxOutputTokens =
				params.maxOutputTokens ?? defaultMaxOutputTokens;
			for (let attempt = 0; attempt < 2; attempt += 1) {
				const response = await client.responses.parse({
					...(await createCommonRequest({
						defaultMaxOutputTokens,
						defaultModel,
						input,
						params: { ...params, maxOutputTokens },
					})),
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
			const client = await getClient();
			const response = await client.responses.create(
				await createCommonRequest({
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
