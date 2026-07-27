import { z } from "zod/v3";
import type { HeNumeralFeatures } from "../../../../../types/concrete-language/features/he/lexeme/numeral.js";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas.js";
import {
	buildOptionalFeatureObjectSchema,
	featureValueSet,
	requireNonEmptyFeatureObject,
} from "../../../../shared/feature-helpers.js";

export const heNumeralFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
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
	})
	.strict() satisfies z.ZodSchema<HeNumeralFeatures>;
