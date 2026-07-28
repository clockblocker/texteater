import { z } from "zod/v4";
import { mapNullishToNullable } from "../../../../core/helpers/nullish-utils";

export function toNullable<
	TInputSchema extends z.ZodTypeAny,
	TOutputSchema extends z.ZodTypeAny,
>(codec: z.ZodCodec<TInputSchema, TOutputSchema>) {
	const inputSchema = codec.in.nullish();
	const outputSchema = codec.out.nullable();
	return z.codec<typeof inputSchema, typeof outputSchema>(
		inputSchema,
		outputSchema,
		{
			decode: (input) =>
				mapNullishToNullable(
					input,
					(value) =>
						codec.decode(
							value as z.input<TInputSchema>,
						) as z.input<TOutputSchema>,
				),
			encode: (output) =>
				mapNullishToNullable(
					output,
					(value) =>
						codec.encode(
							value as z.output<TOutputSchema>,
						) as z.output<TInputSchema>,
				),
		},
	);
}
