import { z } from "zod";
import type { HeDeterminerFeatures } from "../../../../../types/concrete-language/features/he/lexeme/determiner.js";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas.js";
import {
	buildOptionalFeatureObjectSchema,
	featureValueSet,
	requireNonEmptyFeatureObject,
} from "../../../../shared/feature-helpers.js";

export const heDeterminerFeaturesSchema = z.strictObject({
	inherent: buildOptionalFeatureObjectSchema({
		pronType: abstractFeatureAtomSchemas.pronType.extract(["Art", "Int"]),
	}),
	inflectional: requireNonEmptyFeatureObject(
		buildOptionalFeatureObjectSchema({
			definite: abstractFeatureAtomSchemas.definite.extract([
				"Cons",
				"Def",
			]),
			gender: featureValueSet(
				abstractFeatureAtomSchemas.gender.extract(["Fem", "Masc"]),
			),
			number: abstractFeatureAtomSchemas.number.extract(["Plur", "Sing"]),
		}),
	),
}) satisfies z.ZodSchema<HeDeterminerFeatures>;
