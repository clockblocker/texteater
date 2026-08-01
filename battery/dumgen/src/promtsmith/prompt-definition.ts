import type { output, ZodType } from "zod";

type PromptGenerationParams = {
	readonly maxOutputTokens: number;
	readonly model: string;
};

type GeneratedOutput<OutputSchema extends ZodType | null> =
	OutputSchema extends ZodType ? output<OutputSchema> : string;

export type Prompt<
	InputSchema extends ZodType = ZodType,
	OutputSchema extends ZodType | null = ZodType | null,
	Result = GeneratedOutput<OutputSchema>,
> = {
	readonly systemPrompt: string;
	readonly inputSchema: InputSchema;
	readonly outputSchema: OutputSchema;
	readonly outputPostcondition?: {
		assert(
			input: output<InputSchema>,
			generated: GeneratedOutput<OutputSchema>,
		): void;
	};
	projectInput?(input: output<InputSchema>): unknown;
	projectOutput?(
		input: output<InputSchema>,
		generated: GeneratedOutput<OutputSchema>,
	): Result;
	readonly generationParams: PromptGenerationParams;
};

export type PromptCatalogEntry<Definition extends Prompt = Prompt> = {
	readonly meta: {
		readonly kind: "prompt";
	};
	readonly prompt: Definition;
};

export type PromptTree = {
	readonly [key: string]: PromptTree | PromptCatalogEntry;
};
