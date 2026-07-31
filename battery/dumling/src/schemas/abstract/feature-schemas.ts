import { z } from "zod";
import type {
	AbstractCoreFeatures,
	AbstractInflectionalFeatures,
} from "../../types/abstract/features/features-catalog.js";
import { abstractFeatureCatalog } from "../../types/abstract/features/features-catalog.js";
import {
	type FeatureSchemaShape,
	featureValueSet,
	requireNonEmptyFeatureObject,
} from "../shared/feature-helpers.js";

export const abstractFeatureAtomSchemas =
	abstractFeatureCatalog satisfies FeatureSchemaShape;

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
