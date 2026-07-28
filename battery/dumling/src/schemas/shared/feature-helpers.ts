import { z } from "zod";

type NonEmptyFeatureValueSet<T> = readonly [T, ...T[]];

export type FeatureSchemaShape = Record<string, z.ZodType>;

type NullableShape<TShape extends FeatureSchemaShape> = {
	[K in keyof TShape]: z.ZodNullable<TShape[K]>;
};

type NullableFeatureObject<TShape extends FeatureSchemaShape> = {
	[K in keyof TShape]: z.output<TShape[K]> | null;
};

type RequiredFeatureObject<TShape extends FeatureSchemaShape> = {
	[K in keyof TShape]: z.output<TShape[K]>;
};

export function featureValueSet<TSchema extends z.ZodType>(
	schema: TSchema,
): z.ZodType<z.output<TSchema> | NonEmptyFeatureValueSet<z.output<TSchema>>> {
	return z.union([schema, z.array(schema).min(1)]) as unknown as z.ZodType<
		z.output<TSchema> | NonEmptyFeatureValueSet<z.output<TSchema>>
	>;
}

export function buildFeatureObjectSchema<TShape extends FeatureSchemaShape>(
	shape: TShape,
): z.ZodType<RequiredFeatureObject<TShape>> {
	return z.strictObject(shape) as unknown as z.ZodType<
		RequiredFeatureObject<TShape>
	>;
}

export function buildOptionalFeatureObjectSchema<
	TShape extends FeatureSchemaShape,
>(shape: TShape): z.ZodType<NullableFeatureObject<TShape>> {
	const optionalShape = Object.fromEntries(
		Object.entries(shape).map(([name, schema]) => [
			name,
			schema.nullable(),
		]),
	) as NullableShape<TShape>;

	return buildFeatureObjectSchema(optionalShape) as unknown as z.ZodType<
		NullableFeatureObject<TShape>
	>;
}

const hasInflectionSurfaceMetadata = {
	dumlingHasInflectionSurface: true,
} as const;

export function markInflectionSurface<TSchema extends z.ZodType>(
	schema: TSchema,
): TSchema {
	return schema.meta(hasInflectionSurfaceMetadata);
}

export function requireNonEmptyFeatureObject<T extends object>(
	schema: z.ZodType<T>,
	fieldName = "inflectionalFeatures",
): z.ZodType<T> {
	return markInflectionSurface(
		schema.superRefine((value, ctx) => {
			if (!Object.values(value).some((entry) => entry !== null)) {
				ctx.addIssue({
					code: "custom",
					message: `${fieldName} must not be empty`,
				});
			}
		}),
	) as z.ZodType<T>;
}
