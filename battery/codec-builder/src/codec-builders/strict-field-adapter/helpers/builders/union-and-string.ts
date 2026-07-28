import { z } from "zod";

import {
	makeNullableFromNullish,
	mapNullishToNullable,
	type Nullish,
} from "../../../../core/helpers/nullish-utils";
import type { SchemaCodec } from "../../../../core/types";

export function buildNullableUnionAndNullishString<
	const TValues extends NonEmptyStringTuple,
>(valuesOrEnum: TValues | z.ZodEnum<MutableNonEmptyStringTuple<TValues>>) {
	const enumSchema =
		valuesOrEnum instanceof z.ZodEnum
			? valuesOrEnum
			: z.enum(valuesOrEnum as MutableNonEmptyStringTuple<TValues>);

	const inputSchema = z.string().nullish();
	const outputSchema = enumSchema.nullable();
	const allowedValues = enumSchema.options as readonly TValues[number][];

	return {
		fromInput: (v: Nullish<string>): TValues[number] | null =>
			nullableUnionFromNullishString(v, allowedValues),
		fromOutput: (v: TValues[number] | null): TValues[number] | null =>
			nullableStringFromNullableUnion(v),
		inputSchema,
		outputSchema,
	} satisfies SchemaCodec<typeof inputSchema, typeof outputSchema>;
}

// -- Internals --

type NonEmptyStringTuple = readonly [string, ...string[]];
type MutableTuple<T extends readonly string[]> = [...T];
type MutableNonEmptyStringTuple<T extends NonEmptyStringTuple> =
	MutableTuple<T> extends [string, ...string[]] ? MutableTuple<T> : never;

function nullableUnionFromNullishString<TUnion extends string>(
	v: Nullish<string>,
	allowedValues: readonly TUnion[],
): TUnion | null {
	return mapNullishToNullable(v, (value) =>
		allowedValues.includes(value as TUnion) ? (value as TUnion) : null,
	);
}

function nullableStringFromNullableUnion<TUnion extends string>(
	v: Nullish<TUnion>,
): TUnion | null {
	return makeNullableFromNullish(v);
}
