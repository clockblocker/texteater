import { z } from "zod/v4";

import {
	makeNullableFromNullish,
	mapNullishToNullable,
	type Nullish,
} from "../../../../core/helpers/nullish-utils";

export function buildNullableUnionAndNullishString<
	const TValues extends NonEmptyStringTuple,
>(valuesOrEnum: TValues | z.ZodEnum) {
	const enumSchema =
		valuesOrEnum instanceof z.ZodEnum
			? valuesOrEnum
			: z.enum(valuesOrEnum as MutableNonEmptyStringTuple<TValues>);
	const typedEnumSchema = enumSchema as z.ZodType<
		TValues[number],
		TValues[number]
	> & {
		readonly options: readonly TValues[number][];
	};

	const inputSchema = z.string().nullish();
	const outputSchema = typedEnumSchema.nullable();
	const allowedValues = typedEnumSchema.options;

	return z.codec(inputSchema, outputSchema, {
		decode: (v: Nullish<string>): TValues[number] | null =>
			nullableUnionFromNullishString(v, allowedValues),
		encode: (v: TValues[number] | null): TValues[number] | null =>
			nullableStringFromNullableUnion(v),
	});
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
