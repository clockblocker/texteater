export interface PromptSchema<Input = unknown, Output = unknown> {
	parse(input: unknown): Output;
	toJSONSchema(options?: unknown): unknown;
	readonly "~input"?: Input;
	readonly "~output"?: Output;
}

interface AuthoringPromptSchema<Input = unknown, Output = unknown>
	extends PromptSchema<Input, Output> {
	safeParse(
		input: unknown,
	):
		| Readonly<{ data: Output; success: true }>
		| Readonly<{ error: unknown; success: false }>;
}

export type PromptSchemaInput<Schema extends PromptSchema> = Schema extends {
	readonly _zod: { readonly input: infer Input };
}
	? Input
	: Schema extends PromptSchema<infer Input, unknown>
		? Input
		: never;

export type PromptSchemaOutput<Schema extends PromptSchema> = Schema extends {
	readonly _zod: { readonly output: infer Output };
}
	? Output
	: Schema extends PromptSchema<unknown, infer Output>
		? Output
		: never;

type PromptGenerationParams = {
	readonly maxOutputTokens: number;
	readonly model: string;
};

type GeneratedOutput<OutputSchema extends PromptSchema | null> =
	OutputSchema extends PromptSchema
		? PromptSchemaOutput<OutputSchema>
		: string;

export type Prompt<
	InputSchema extends PromptSchema = AuthoringPromptSchema,
	OutputSchema extends PromptSchema | null = AuthoringPromptSchema | null,
	Result = GeneratedOutput<OutputSchema>,
	ModelInputSchema extends PromptSchema = InputSchema,
> = {
	readonly systemPrompt: string;
	readonly inputSchema: InputSchema;
	readonly modelInputSchema?: ModelInputSchema;
	readonly outputSchema: OutputSchema;
	/**
	 * Builds the strict schema sent to the model provider after the canonical
	 * input has been parsed. This supports sparse request-shaped outputs without
	 * weakening the canonical Prompt Source schema used by corpora and tests.
	 */
	modelOutputSchemaFor?(input: PromptSchemaOutput<InputSchema>): PromptSchema;
	readonly outputPostcondition?: {
		assert(
			input: PromptSchemaOutput<InputSchema>,
			generated: GeneratedOutput<OutputSchema>,
		): void;
	};
	projectInput?(
		input: PromptSchemaOutput<InputSchema>,
	): PromptSchemaOutput<ModelInputSchema>;
	projectOutput?(
		input: PromptSchemaOutput<InputSchema>,
		generated: GeneratedOutput<OutputSchema>,
	): Result;
	readonly generationParams: PromptGenerationParams;
};

type AnyPromptDefinition = Prompt<
	PromptSchema,
	PromptSchema | null,
	unknown,
	PromptSchema
>;

export type PromptCatalogEntry<
	Definition extends AnyPromptDefinition = Prompt,
> = {
	readonly meta: {
		readonly kind: "prompt";
	};
	readonly prompt: Definition;
};

export type PromptTree = {
	readonly [key: string]:
		| PromptTree
		| PromptCatalogEntry<AnyPromptDefinition>;
};
