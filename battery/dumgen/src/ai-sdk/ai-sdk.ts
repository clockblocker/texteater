import { buildOpenAiFetchSdk } from "./openai-fetch";

export {
	AiSdkGenerationError,
	type GenerationFailureReason,
} from "./ai-sdk-generation-error";

type GenerationParams = {
	readonly maxOutputTokens?: number;
	readonly model?: string;
	readonly systemPrompt?: string;
};

export type AiSdk = {
	readonly structuredGeneration: <
		OutputSchema extends StructuredOutputSchema,
	>(
		input: string,
		outputSchema: OutputSchema,
		params?: GenerationParams,
	) => Promise<StructuredSchemaOutput<OutputSchema>>;
	readonly unstructuredGeneration: (
		input: string,
		params?: GenerationParams,
	) => Promise<string>;
};

export interface StructuredOutputSchema<Output = unknown> {
	parse(input: unknown): Output;
	toJSONSchema(options?: unknown): unknown;
}

export type StructuredSchemaOutput<Schema extends StructuredOutputSchema> =
	ReturnType<Schema["parse"]>;

type BuildAiSdkOptions = {
	/**
	 * Defaults to OPENAI_API_KEY through the lean Responses fetch adapter.
	 */
	readonly apiKey?: string;
};

export function buildAiSdk(options: BuildAiSdkOptions = {}): AiSdk {
	return buildOpenAiFetchSdk(options);
}
