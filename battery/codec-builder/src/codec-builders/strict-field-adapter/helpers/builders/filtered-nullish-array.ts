import { z } from "zod";

import type { SchemaCodec } from "../../../../core/types";

export function buildFilteredNullishArrayCodec<
	TInputItemSchema extends z.ZodTypeAny,
	TOutputItemSchema extends z.ZodTypeAny = TInputItemSchema,
>(
	inputItemSchema: TInputItemSchema,
	outputItemSchema = inputItemSchema as unknown as TOutputItemSchema,
) {
	const inputSchema = z.array(inputItemSchema);
	const outputSchema = z.array(outputItemSchema);

	return {
		fromInput: (input) =>
			input.filter(Boolean) as z.output<TOutputItemSchema>[],
		fromOutput: (output) => output as z.output<TInputItemSchema>[],
		inputSchema,
		outputSchema,
	} as const satisfies SchemaCodec<typeof inputSchema, typeof outputSchema>;
}
