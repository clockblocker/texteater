import { z } from "zod";
import type { HeNounFeatures } from "../../../../../types/concrete-language/features/he/lexeme/noun.js";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas.js";
import {
	buildOptionalFeatureObjectSchema,
	featureValueSet,
	requireNonEmptyFeatureObject,
} from "../../../../shared/feature-helpers.js";

export const heNounFeaturesSchema = z.strictObject({
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
}) satisfies z.ZodSchema<HeNounFeatures>;
