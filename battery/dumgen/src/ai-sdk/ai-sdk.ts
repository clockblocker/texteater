import type { output, ZodType } from "zod";

import { buildOpenAiSdk } from "./openai";

type GenerationParams = {
	readonly maxOutputTokens?: number;
	readonly model?: string;
	readonly systemPrompt?: string;
};

export type AiSdk = {
	readonly structuredGeneration: <OutputSchema extends ZodType>(
		input: string,
		outputSchema: OutputSchema,
		params?: GenerationParams,
	) => Promise<output<OutputSchema>>;
	readonly unstructuredGeneration: (
		input: string,
		params?: GenerationParams,
	) => Promise<string>;
};

type BuildAiSdkOptions = {
	/**
	 * Defaults to OPENAI_API_KEY through the OpenAI SDK.
	 */
	readonly apiKey?: string;
};

export function buildAiSdk(options: BuildAiSdkOptions = {}): AiSdk {
	return buildOpenAiSdk(options);
}
