import { z } from "zod/v4";

export function toNonNullishWithDefault<
	TInputSchema extends z.ZodTypeAny,
	TOutputSchema extends z.ZodTypeAny,
>(
	codec: z.ZodCodec<
		z.ZodOptional<z.ZodNullable<TInputSchema>>,
		z.ZodNullable<TOutputSchema>
	>,
	defaultValue: z.output<TOutputSchema>,
) {
	const outputSchema = codec.out.unwrap();

	return z.codec(codec.in, outputSchema, {
		decode: (input) =>
			(codec.decode(input as z.input<typeof codec>) ??
				defaultValue) as z.input<typeof outputSchema>,
		encode: (output) =>
			codec.encode(output as z.output<typeof codec>) as z.output<
				typeof codec.in
			>,
	});
}
