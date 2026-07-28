/* eslint-disable @typescript-eslint/no-explicit-any -- Library generic shape */
/** biome-ignore-all lint/suspicious/noExplicitAny: Library generic shape */
import type { z } from "zod/v4";

// Prefer naming codecs like: OutputAndInput for readability.
export type CodecPair<I, O> = {
	decode: (input: I) => O;
	encode: (output: O) => I;
};

export type NoOpCodec = {
	readonly __noOpCodec: true;
};

export type SchemaShapeOf<TSchema extends z.ZodObject> =
	TSchema extends z.ZodObject<infer TShape, any> ? TShape : never;
