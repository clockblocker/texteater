import type { input, output, ZodType } from "zod";

export type PromptInputSchema = ZodType;
export type PromptOutputSchema = ZodType;
export type PromptBody = string;

export type Example<Input, Output> = {
	readonly id: string;
	readonly input: Input;
	readonly idealOutput: Output;
};

export type ExampleSet<
	InputSchema extends PromptInputSchema,
	OutputSchema extends PromptOutputSchema,
> = readonly Example<input<InputSchema>, input<OutputSchema>>[];

export type ParsedExampleSet<
	InputSchema extends PromptInputSchema,
	OutputSchema extends PromptOutputSchema,
> = readonly Example<output<InputSchema>, output<OutputSchema>>[];
