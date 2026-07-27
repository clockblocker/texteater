import { z } from "zod/v3";
import type { HeProperNounFeatures } from "../../../../../types/concrete-language/features/he/lexeme/proper-noun";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas";
import {
	buildOptionalFeatureObjectSchema,
	featureValueSet,
	requireNonEmptyFeatureObject,
} from "../../../../shared/feature-helpers";

export const heProperNounFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({
			abbr: abstractFeatureAtomSchemas.abbr,
			gender: featureValueSet(
				abstractFeatureAtomSchemas.gender.extract(["Fem", "Masc"]),
			),
		}),
		inflectional: requireNonEmptyFeatureObject(
			buildOptionalFeatureObjectSchema({
				number: abstractFeatureAtomSchemas.number.extract([
					"Plur",
					"Sing",
				]),
			}),
		),
	})
	.strict() satisfies z.ZodSchema<HeProperNounFeatures>;
