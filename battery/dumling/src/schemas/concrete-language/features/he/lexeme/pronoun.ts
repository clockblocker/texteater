import { z } from "zod";
import type { HePronounFeatures } from "../../../../../types/concrete-language/features/he/lexeme/pronoun.js";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas.js";
import {
	buildOptionalFeatureObjectSchema,
	featureValueSet,
	requireNonEmptyFeatureObject,
} from "../../../../shared/feature-helpers.js";

export const hePronounFeaturesSchema = z.strictObject({
	core: buildOptionalFeatureObjectSchema({
		definite: abstractFeatureAtomSchemas.definite.extract(["Def"]),
		pronType: abstractFeatureAtomSchemas.pronType.extract([
			"Dem",
			"Ind",
			"Int",
			"Prs",
		]),
		reflex: abstractFeatureAtomSchemas.reflex,
	}),
	inflectional: requireNonEmptyFeatureObject(
		buildOptionalFeatureObjectSchema({
			gender: featureValueSet(
				abstractFeatureAtomSchemas.gender.extract(["Fem", "Masc"]),
			),
			number: abstractFeatureAtomSchemas.number.extract(["Plur", "Sing"]),
			person: abstractFeatureAtomSchemas.person.extract(["1", "2", "3"]),
		}),
	),
}) satisfies z.ZodSchema<HePronounFeatures>;
