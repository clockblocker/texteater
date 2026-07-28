/* eslint-disable @typescript-eslint/no-explicit-any -- Library generic shape */
/** biome-ignore-all lint/suspicious/noExplicitAny: Library generic shape */
import type { z } from "zod";
import type { Prettify } from "./helpers/helper-types";

// Prefer naming codecs like: OutputAndInput for readability.
export type CodecPair<I, O> = {
	fromInput: (input: I) => O;
	fromOutput: (output: O) => I;
};

// Prefer naming codecs like: OutputAndInput for consistent readability.
export type Codec<
	O = unknown,
	I = unknown,
	TInputSchema extends z.ZodType<I, z.ZodTypeDef, any> = z.ZodType<
		I,
		z.ZodTypeDef,
		any
	>,
	TOutputSchema extends z.ZodType<O, z.ZodTypeDef, any> = z.ZodType<
		O,
		z.ZodTypeDef,
		any
	>,
> = Prettify<
	CodecPair<I, O> & {
		inputSchema: TInputSchema;
		outputSchema: TOutputSchema;
	}
>;

export type SchemaCodec<
	TInputSchema extends z.ZodTypeAny = z.ZodTypeAny,
	TOutputSchema extends z.ZodTypeAny = z.ZodTypeAny,
> = Codec<
	z.output<TOutputSchema>,
	z.output<TInputSchema>,
	TInputSchema,
	TOutputSchema
>;

export type NoOpCodec = {
	readonly __noOpCodec: true;
};

export type SchemaShapeOf<TSchema extends z.AnyZodObject> =
	TSchema extends z.ZodObject<infer TShape, any, any, any, any>
		? TShape
		: never;

export type AnyCodec = Codec<any, any>;
