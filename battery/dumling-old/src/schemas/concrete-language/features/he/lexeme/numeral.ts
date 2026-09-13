import { z } from "zod";
import type { HeNumeralFeatures } from "../../../../../types/concrete-language/features/he/lexeme/numeral.js";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas.js";
import {
	buildOptionalFeatureObjectSchema,
	featureValueSet,
	requireNonEmptyFeatureObject,
} from "../../../../shared/feature-helpers.js";

export const heNumeralFeaturesSchema = z.strictObject({
	core: buildOptionalFeatureObjectSchema({}),
	inflectional: requireNonEmptyFeatureObject(
		buildOptionalFeatureObjectSchema({
			definite: abstractFeatureAtomSchemas.definite.extract([
				"Cons",
				"Def",
			]),
			gender: featureValueSet(
				abstractFeatureAtomSchemas.gender.extract(["Fem", "Masc"]),
			),
			number: featureValueSet(
				abstractFeatureAtomSchemas.number.extract(["Dual", "Plur"]),
			),
		}),
	),
}) satisfies z.ZodSchema<HeNumeralFeatures>;
