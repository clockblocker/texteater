import * as Context from "effect/Context";
import type { Effect } from "effect/Effect";
import type { AiSdkGenerationError } from "./ai-sdk-generation-error";

export {
	AiSdkGenerationError,
	type GenerationFailureReason,
} from "./ai-sdk-generation-error";
export type {
	GenerationEvent,
	GenerationFailure,
	GenerationFailureCategory,
	GenerationFailureInput,
	RetryableGenerationFailureCategory,
	TerminalGenerationFailureCategory,
} from "./model-generation";

type GenerationParams = {
	readonly maxOutputTokens?: number;
	readonly model?: string;
	readonly systemPrompt?: string;
};

/** The provider boundary for structured and unstructured model generation. */
export type ModelGenerator = {
	readonly structuredGeneration: <
		OutputSchema extends StructuredOutputSchema,
	>(
		input: string,
		outputSchema: OutputSchema,
		params?: GenerationParams,
	) => Effect<StructuredSchemaOutput<OutputSchema>, AiSdkGenerationError>;
	readonly unstructuredGeneration: (
		input: string,
		params?: GenerationParams,
	) => Effect<string, AiSdkGenerationError>;
};

/** The injected model boundary shared by Dumgen and Knowledge runtime layers. */
export class ModelGeneratorService extends Context.Tag("dumgen/ModelGenerator")<
	ModelGeneratorService,
	ModelGenerator
>() {}

export interface StructuredOutputSchema<Output = unknown> {
	parse(input: unknown): Output;
	toJSONSchema(options?: unknown): unknown;
}

export type StructuredSchemaOutput<Schema extends StructuredOutputSchema> =
	ReturnType<Schema["parse"]>;
