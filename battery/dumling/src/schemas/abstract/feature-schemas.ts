import type { z } from "zod/v3";
import type {
	AbstractInflectionalFeatures,
	AbstractInherentFeatures,
} from "../../types/abstract/features/features-catalog";
import { abstractFeatureCatalog } from "../../types/abstract/features/features-catalog";
import {
	type FeatureSchemaShape,
	buildOptionalFeatureObjectSchema,
	featureValueSet,
	requireNonEmptyFeatureObject,
} from "../shared/feature-helpers";

export const abstractFeatureAtomSchemas =
	abstractFeatureCatalog satisfies FeatureSchemaShape;

const abstractInflectionalFeatureValueSchemas = Object.fromEntries(
	Object.entries(abstractFeatureAtomSchemas).map(([name, schema]) => [
		name,
		featureValueSet(schema),
	]),
) as FeatureSchemaShape;

export const abstractInherentFeaturesSchema = buildOptionalFeatureObjectSchema(
	abstractInflectionalFeatureValueSchemas,
) satisfies z.ZodType<AbstractInherentFeatures>;

export const abstractInflectionalFeaturesSchema = requireNonEmptyFeatureObject(
	buildOptionalFeatureObjectSchema(abstractInflectionalFeatureValueSchemas),
) satisfies z.ZodType<AbstractInflectionalFeatures>;
