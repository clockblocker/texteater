/* eslint-disable @typescript-eslint/no-explicit-any -- helper keeps codec generics broad */
import { z } from "zod/v4";

export function toOptional<
	TInputSchema extends z.ZodTypeAny,
	TOutputSchema extends z.ZodTypeAny,
>(codec: z.ZodCodec<TInputSchema, TOutputSchema>) {
	const inputSchema = codec.in.optional();
	const outputSchema = codec.out.optional();
	return z.codec<typeof inputSchema, typeof outputSchema>(
		inputSchema,
		outputSchema,
		{
			decode: (input) =>
				input === undefined
					? undefined
					: (codec.decode(
							input as z.input<TInputSchema>,
						) as z.input<TOutputSchema>),
			encode: (output) =>
				output === undefined
					? undefined
					: (codec.encode(
							output as z.output<TOutputSchema>,
						) as z.output<TInputSchema>),
		},
	);
}
