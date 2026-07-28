/* eslint-disable @typescript-eslint/no-explicit-any -- helper keeps codec generics broad */
import type { z } from "zod";
import type { SchemaCodec } from "../../../../core/types";
import { toNullable } from "./to-nullable";
import { toOptional } from "./to-optional";

export function toNullish<
	TInputSchema extends z.ZodTypeAny,
	TOutputSchema extends z.ZodTypeAny,
>(codec: SchemaCodec<TInputSchema, TOutputSchema>) {
	return toOptional<
		z.ZodOptional<z.ZodNullable<TInputSchema>>,
		z.ZodNullable<TOutputSchema>
	>(toNullable(codec));
}
