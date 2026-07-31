import { z } from "zod";
import type { HeAdjectiveFeatures } from "../../../../../types/concrete-language/features/he/lexeme/adjective.js";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas.js";
import {
	buildOptionalFeatureObjectSchema,
	featureValueSet,
	requireNonEmptyFeatureObject,
} from "../../../../shared/feature-helpers.js";

export const heAdjectiveFeaturesSchema = z.strictObject({
	core: buildOptionalFeatureObjectSchema({
		abbr: abstractFeatureAtomSchemas.abbr,
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
}) satisfies z.ZodSchema<HeAdjectiveFeatures>;
