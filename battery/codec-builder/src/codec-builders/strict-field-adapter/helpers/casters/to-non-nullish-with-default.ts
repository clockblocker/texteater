/* eslint-disable @typescript-eslint/no-explicit-any -- helper keeps codec generics broad */
import type { z } from "zod";
import type { SchemaCodec } from "../../../../core/types";

export function toNonNullishWithDefault<
	TInputSchema extends z.ZodTypeAny,
	TOutputSchema extends z.ZodTypeAny,
>(
	codec: SchemaCodec<
		z.ZodOptional<z.ZodNullable<TInputSchema>>,
		z.ZodNullable<TOutputSchema>
	>,
	defaultValue: z.output<TOutputSchema>,
) {
	const inputSchema = codec.inputSchema;
	const outputSchema = codec.outputSchema.unwrap();

	return {
		fromInput: (input) => codec.fromInput(input) ?? defaultValue,
		fromOutput: (output) => codec.fromOutput(output),
		inputSchema,
		outputSchema,
	} as const satisfies SchemaCodec<typeof inputSchema, typeof outputSchema>;
}
