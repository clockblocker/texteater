import { z } from "zod/v4";

export function toArrayOf<
	TInputSchema extends z.ZodTypeAny,
	TOutputSchema extends z.ZodTypeAny,
>(itemCodec: z.ZodCodec<TInputSchema, TOutputSchema>) {
	return z.codec(z.array(itemCodec.in), z.array(itemCodec.out), {
		decode: (input) =>
			input.map((item) =>
				itemCodec.decode(item as z.input<TInputSchema>),
			) as z.input<TOutputSchema>[],
		encode: (output) =>
			output.map((item) =>
				itemCodec.encode(item as z.output<TOutputSchema>),
			) as z.output<TInputSchema>[],
	});
}
