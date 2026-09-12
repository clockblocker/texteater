import { z } from "zod";

export { featureValueSetSchema } from "./feature-value-set.js";
export { nonEmptyFeatureBagSchema } from "./non-empty-feature-bag.js";

type FeatureSchemaShape = Record<string, z.ZodType>;

type NullableFeatureBag<Shape extends FeatureSchemaShape> = {
	[Name in keyof Shape]: z.output<Shape[Name]> | null;
};

export function featureBagSchema<const Shape extends FeatureSchemaShape>(
	shape: Shape,
) {
	const nullableShape = Object.fromEntries(
		Object.entries(shape).map(([name, schema]) => [
			name,
			schema.nullable(),
		]),
	) as {
		[Name in keyof Shape]: z.ZodNullable<Shape[Name]>;
	};

	return z.strictObject(nullableShape) as z.ZodType<
		NullableFeatureBag<Shape>
	>;
}
