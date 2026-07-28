/* eslint-disable @typescript-eslint/no-explicit-any -- helper keeps codec generics broad */
import type { z } from "zod";
import { mapNullishToNullable } from "../../../../core/helpers/nullish-utils";
import type { SchemaCodec } from "../../../../core/types";

export function toNullable<
	TInputSchema extends z.ZodTypeAny,
	TOutputSchema extends z.ZodTypeAny,
>(codec: SchemaCodec<TInputSchema, TOutputSchema>) {
	const inputSchema = codec.inputSchema.nullish();
	const outputSchema = codec.outputSchema.nullable();

	return {
		fromInput: (input) => mapNullishToNullable(input, codec.fromInput),
		fromOutput: (output) => mapNullishToNullable(output, codec.fromOutput),
		inputSchema,
		outputSchema,
	} as const satisfies SchemaCodec<typeof inputSchema, typeof outputSchema>;
}
