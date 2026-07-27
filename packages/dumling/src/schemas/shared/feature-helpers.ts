import { z } from "zod/v3";
import { abstractFeatureCatalog } from "../../types/abstract/features/features-catalog";

type NonEmptyFeatureValueSet<T> = readonly [T, ...T[]];

export type FeatureSchemaShape = Record<string, z.ZodTypeAny>;

type OptionalizedShape<TShape extends FeatureSchemaShape> = {
	[K in keyof TShape]: z.ZodOptional<TShape[K]>;
};

type InferFeatureObject<TShape extends FeatureSchemaShape> = Partial<{
	[K in keyof TShape]: z.output<TShape[K]>;
}>;

type RequiredFeatureObject<TShape extends FeatureSchemaShape> = {
	[K in keyof TShape]: z.output<TShape[K]>;
};

type RequireAtLeastOne<T extends object> = {
	[K in keyof T]-?: Required<Pick<T, K>> & Partial<Omit<T, K>>;
}[keyof T];

export function featureValueSet<TSchema extends z.ZodTypeAny>(
	schema: TSchema,
): z.ZodType<z.output<TSchema> | NonEmptyFeatureValueSet<z.output<TSchema>>> {
	return z.union([
		schema,
		z
			.array(schema)
			.min(1)
			.transform(
				(values) =>
					values as [z.output<TSchema>, ...z.output<TSchema>[]],
			),
	]) as unknown as z.ZodType<
		z.output<TSchema> | NonEmptyFeatureValueSet<z.output<TSchema>>
	>;
}

function stripUnknownOntologyFeatureKeys(value: unknown) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return value;
	}

	return Object.fromEntries(
		Object.entries(value).filter(
			([name]) => name in abstractFeatureCatalog,
		),
	);
}

export function buildFeatureObjectSchema<TShape extends FeatureSchemaShape>(
	shape: TShape,
): z.ZodType<RequiredFeatureObject<TShape>> {
	return z.preprocess(
		stripUnknownOntologyFeatureKeys,
		z.object(shape).strict(),
	) as unknown as z.ZodType<RequiredFeatureObject<TShape>>;
}

export function buildOptionalFeatureObjectSchema<
	TShape extends FeatureSchemaShape,
>(shape: TShape): z.ZodType<InferFeatureObject<TShape>> {
	const optionalShape = Object.fromEntries(
		Object.entries(shape).map(([name, schema]) => [
			name,
			schema.optional(),
		]),
	) as OptionalizedShape<TShape>;

	return buildFeatureObjectSchema(optionalShape) as unknown as z.ZodType<
		InferFeatureObject<TShape>
	>;
}

export function requireNonEmptyFeatureObject<T extends object>(
	schema: z.ZodType<T>,
	fieldName = "inflectionalFeatures",
): z.ZodType<RequireAtLeastOne<T>> {
	return schema.superRefine((value, ctx) => {
		if (Object.keys(value).length === 0) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `${fieldName} must not be empty`,
			});
		}
	}) as unknown as z.ZodType<RequireAtLeastOne<T>>;
}
