import { z } from "zod";

import type { SchemaCodec } from "../../../../core/types";

export function toArrayOf<
	TInputSchema extends z.ZodTypeAny,
	TOutputSchema extends z.ZodTypeAny,
>(itemCodec: SchemaCodec<TInputSchema, TOutputSchema>) {
	const inputSchema = z.array(itemCodec.inputSchema);
	const outputSchema = z.array(itemCodec.outputSchema);

	return {
		fromInput: (input) => input.map(itemCodec.fromInput),
		fromOutput: (output) => output.map(itemCodec.fromOutput),
		inputSchema,
		outputSchema,
	} as const satisfies SchemaCodec<typeof inputSchema, typeof outputSchema>;
}
