import { z } from "zod/v4";

import type { CodecPair } from "./types";

export function pipeCodecs<
	TInputSchema extends z.ZodTypeAny,
	TIntermediateSchema extends z.ZodTypeAny,
	TOutputSchema extends z.ZodTypeAny,
>(
	left: z.ZodCodec<TInputSchema, TIntermediateSchema>,
	right: z.ZodCodec<TIntermediateSchema, TOutputSchema>,
): z.ZodCodec<TInputSchema, TOutputSchema>;
export function pipeCodecs<A, B, C>(
	left: CodecPair<A, B>,
	right: CodecPair<B, C>,
): CodecPair<A, C>;
export function pipeCodecs<A, B, C>(
	left: z.ZodCodec | CodecPair<A, B>,
	right: z.ZodCodec | CodecPair<B, C>,
) {
	if (left instanceof z.ZodCodec && right instanceof z.ZodCodec) {
		return z.codec(left.in, right.out, {
			decode: (input) => right.decode(left.decode(input)),
			encode: (output) => left.encode(right.encode(output)),
		});
	}

	const leftPair = left as CodecPair<A, B>;
	const rightPair = right as CodecPair<B, C>;
	return {
		decode: (input: A) => rightPair.decode(leftPair.decode(input)),
		encode: (output: C) => leftPair.encode(rightPair.encode(output)),
	};
}
