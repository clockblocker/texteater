import type { PrettifyDeep } from "common-utils";
import { z } from "zod";

export { featureValueSetSchema } from "./feature-value-set.js";
export { nonEmptyFeatureBagSchema } from "./non-empty-feature-bag.js";

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
