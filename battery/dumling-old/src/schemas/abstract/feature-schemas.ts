import { z } from "zod";
import type {
	AbstractCoreFeatures,
	AbstractFeatureAtomDefinition,
	AbstractInflectionalFeatures,
} from "../../types/abstract/features/features-catalog.js";
import { abstractFeatureCatalog } from "../../types/abstract/features/features-catalog.js";
import {
	type FeatureSchemaShape,
	featureValueSet,
	requireNonEmptyFeatureObject,
} from "../shared/feature-helpers.js";

type AbstractFeatureAtomSchemaCatalog = {
	[Name in keyof typeof abstractFeatureCatalog]: (typeof abstractFeatureCatalog)[Name] extends readonly [
		infer Value extends string,
	]
		? z.ZodLiteral<Value>
		: (typeof abstractFeatureCatalog)[Name] extends readonly string[]
			? z.ZodEnum<{
					[Value in (typeof abstractFeatureCatalog)[Name][number]]: Value;
				}>
			: z.ZodString;
};

function buildAbstractFeatureAtomSchema(
	definition: AbstractFeatureAtomDefinition,
): z.ZodType {
	return definition === null
		? z.string().min(1)
		: definition.length === 1
			? z.literal(definition[0] as string)
			: z.enum(definition as readonly string[]);
}

export const abstractFeatureAtomSchemas = Object.fromEntries(
	Object.entries(abstractFeatureCatalog).map(([name, definition]) => [
		name,
		buildAbstractFeatureAtomSchema(definition),
	]),
) as AbstractFeatureAtomSchemaCatalog satisfies FeatureSchemaShape;

function buildAbstractFeatureObjectSchema(shape: FeatureSchemaShape) {
	return z.strictObject(
		Object.fromEntries(
			Object.entries(shape).map(([name, schema]) => [
				name,
				schema.optional(),
			]),
		),
	);
}

const abstractInflectionalFeatureValueSchemas = Object.fromEntries(
	Object.entries(abstractFeatureAtomSchemas).map(([name, schema]) => [
		name,
		featureValueSet(schema),
	]),
) as FeatureSchemaShape;

export const abstractCoreFeaturesSchema = buildAbstractFeatureObjectSchema(
	abstractInflectionalFeatureValueSchemas,
) satisfies z.ZodType<AbstractCoreFeatures>;

export const abstractInflectionalFeaturesSchema = requireNonEmptyFeatureObject(
	buildAbstractFeatureObjectSchema(abstractInflectionalFeatureValueSchemas),
) satisfies z.ZodType<AbstractInflectionalFeatures>;
