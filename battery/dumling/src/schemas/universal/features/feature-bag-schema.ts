import type { PrettifyDeep } from "common-utils";
import { z } from "zod";
import {
	hasMarkedFeature,
	nonEmptyFeatureBagError,
} from "../../../validation/semantics.js";

type FeatureSchemaShape = Record<string, z.ZodType>;

type NullableFeatureBag<Shape extends FeatureSchemaShape> = PrettifyDeep<{
	-readonly [Name in keyof Shape]: z.output<Shape[Name]> | null;
}>;

type FeatureBagSchema<Shape extends FeatureSchemaShape> =
	keyof Shape extends never
		? z.ZodType<Record<never, never>>
		: z.ZodType<NullableFeatureBag<Shape>>;

export function featureBagSchema<const Shape extends FeatureSchemaShape>(
	shape: Shape,
): FeatureBagSchema<Shape> {
	const nullableShape = Object.fromEntries(
		Object.entries(shape).map(([name, schema]) => [
			name,
			schema.nullable(),
		]),
	) as {
		[Name in keyof Shape]: z.ZodNullable<Shape[Name]>;
	};

	return z.strictObject(nullableShape) as unknown as FeatureBagSchema<Shape>;
}

export function featureValueSetSchema<const Schema extends z.ZodType>(
	schema: Schema,
) {
	return z.union([schema, z.tuple([schema], schema)]);
}

export function nonEmptyFeatureBagSchema<
	const Schema extends z.ZodType<Record<string, unknown>>,
>(schema: Schema) {
	return schema.refine(hasMarkedFeature, { error: nonEmptyFeatureBagError });
}
