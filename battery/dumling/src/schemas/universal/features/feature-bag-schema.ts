import type { PrettifyDeep } from "common-utils";
import { z } from "zod";
import {
	featureValueSetError,
	hasMarkedFeature,
	isFeatureValueSet,
	nonEmptyFeatureBagError,
} from "../../../validation/semantics.js";
import { FeatureBagKind } from "./feature-bag-kind.js";

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
	// `Object.fromEntries` forgets the keys it maps, so the shape is named.
	const nullableShape = Object.fromEntries(
		Object.entries(shape).map(([name, schema]) => [
			name,
			schema.nullable(),
		]),
	) as {
		[Name in keyof Shape]: z.ZodNullable<Shape[Name]>;
	};

	// TypeScript can't relate a strict object's output to the conditional
	// `FeatureBagSchema` of a generic shape.
	return z.strictObject(nullableShape) as unknown as FeatureBagSchema<Shape>;
}

type FeatureBagsShape = {
	[FeatureBagKind.Core]: unknown;
	[FeatureBagKind.Inflectional]?: unknown;
};

/**
 * A route's Feature Bags: its Core bag and, when its Surfaces inflect, its
 * inflectional bag, each drawn from the Feature Pool (system ADR 0032). The
 * route's generated schema entrypoint asserts that, so a feature outside the
 * pool fails `bun run check` there.
 */
export function featureBags<Shape extends FeatureBagsShape>(bags: Shape) {
	return z.strictObject(bags);
}

/** The Feature Bags of a route with no features: one empty Core bag. */
export const featurelessBags = featureBags({
	[FeatureBagKind.Core]: featureBagSchema({}),
});

/**
 * A set of two or more of a feature's values: distinct, in catalog order
 * (system ADR 0032). The catalog's values must be in code-point order, which
 * every UD catalog is, so the set rule can compare spellings.
 */
export function featureValueTupleSchema<
	const Catalog extends Readonly<Record<string, string>>,
>(schema: z.ZodEnum<Catalog>) {
	const { options } = schema;
	if (!isFeatureValueSet(options))
		throw new Error(
			`A feature value set needs a catalog in code-point order: ${options.join(", ")}`,
		);
	return z
		.tuple([schema, schema], schema)
		.refine(isFeatureValueSet, { error: featureValueSetError });
}

/** One value of a feature, or a set of two or more of its values. */
export function featureValueSetSchema<
	const Catalog extends Readonly<Record<string, string>>,
>(schema: z.ZodEnum<Catalog>) {
	return z.union([schema, featureValueTupleSchema(schema)]);
}

export function nonEmptyFeatureBagSchema<
	const Schema extends z.ZodType<Record<string, unknown>>,
>(schema: Schema) {
	return schema.refine(hasMarkedFeature, { error: nonEmptyFeatureBagError });
}
