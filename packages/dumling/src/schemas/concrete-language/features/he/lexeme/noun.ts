import { z } from "zod/v3";
import type { HeNounFeatures } from "../../../../../types/concrete-language/features/he/lexeme/noun";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas";
import {
	buildOptionalFeatureObjectSchema,
	featureValueSet,
	requireNonEmptyFeatureObject,
} from "../../../../shared/feature-helpers";

export const heNounFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({
			abbr: abstractFeatureAtomSchemas.abbr,
			gender: featureValueSet(
				abstractFeatureAtomSchemas.gender.extract(["Fem", "Masc"]),
			),
		}),
		inflectional: requireNonEmptyFeatureObject(
			buildOptionalFeatureObjectSchema({
				definite: abstractFeatureAtomSchemas.definite.extract([
					"Cons",
					"Def",
				]),
				number: featureValueSet(
					abstractFeatureAtomSchemas.number.extract(["Dual", "Plur"]),
				),
			}),
		),
	})
	.strict() satisfies z.ZodSchema<HeNounFeatures>;
