import { z } from "zod/v4";

export function toNullish<
	TInputSchema extends z.ZodTypeAny,
	TOutputSchema extends z.ZodTypeAny,
>(codec: z.ZodCodec<TInputSchema, TOutputSchema>) {
	const inputSchema = codec.in.nullish();
	const outputSchema = codec.out.nullish();
	return z.codec<typeof inputSchema, typeof outputSchema>(
		inputSchema,
		outputSchema,
		{
			decode: (input) => {
				if (input === null || input === undefined) {
					return input as null | undefined;
				}
				return codec.decode(
					input as z.input<TInputSchema>,
				) as z.input<TOutputSchema>;
			},
			encode: (output) => {
				if (output === null || output === undefined) {
					return output as null | undefined;
				}
				return codec.encode(
					output as z.output<TOutputSchema>,
				) as z.output<TInputSchema>;
			},
		},
	);
}
