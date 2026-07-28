import { z } from "zod";
import type { HeProperNounFeatures } from "../../../../../types/concrete-language/features/he/lexeme/proper-noun.js";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas.js";
import {
	buildOptionalFeatureObjectSchema,
	featureValueSet,
	requireNonEmptyFeatureObject,
} from "../../../../shared/feature-helpers.js";

export const heProperNounFeaturesSchema = z.strictObject({
	inherent: buildOptionalFeatureObjectSchema({
		abbr: abstractFeatureAtomSchemas.abbr,
		gender: featureValueSet(
			abstractFeatureAtomSchemas.gender.extract(["Fem", "Masc"]),
		),
	}),
	inflectional: requireNonEmptyFeatureObject(
		buildOptionalFeatureObjectSchema({
			number: abstractFeatureAtomSchemas.number.extract(["Plur", "Sing"]),
		}),
	),
}) satisfies z.ZodSchema<HeProperNounFeatures>;
