/* eslint-disable @typescript-eslint/no-explicit-any -- helper keeps codec generics broad */
import type { z } from "zod";
import type { SchemaCodec } from "../../../../core/types";

export function toOptional<
	TInputSchema extends z.ZodTypeAny,
	TOutputSchema extends z.ZodTypeAny,
>(codec: SchemaCodec<TInputSchema, TOutputSchema>) {
	const inputSchema = codec.inputSchema.optional();
	const outputSchema = codec.outputSchema.optional();

	return {
		fromInput: (input) =>
			input === undefined ? undefined : codec.fromInput(input),
		fromOutput: (output) =>
			output === undefined ? undefined : codec.fromOutput(output),
		inputSchema,
		outputSchema,
	} as const satisfies SchemaCodec<typeof inputSchema, typeof outputSchema>;
}
