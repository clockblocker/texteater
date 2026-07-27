import { z } from "zod/v3";
import type { HeVerbFeatures } from "../../../../../types/concrete-language/features/he/lexeme/verb";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas";
import {
	buildOptionalFeatureObjectSchema,
	featureValueSet,
	requireNonEmptyFeatureObject,
} from "../../../../shared/feature-helpers";

export const heVerbFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({
			hebBinyan: abstractFeatureAtomSchemas.hebBinyan,
			hebExistential: abstractFeatureAtomSchemas.hebExistential,
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
				mood: abstractFeatureAtomSchemas.mood.extract(["Imp"]),
				number: abstractFeatureAtomSchemas.number.extract([
					"Plur",
					"Sing",
				]),
				person: featureValueSet(
					abstractFeatureAtomSchemas.person.extract(["1", "2", "3"]),
				),
				polarity: abstractFeatureAtomSchemas.polarity.extract([
					"Neg",
					"Pos",
				]),
				tense: abstractFeatureAtomSchemas.tense.extract([
					"Fut",
					"Past",
				]),
				verbForm: abstractFeatureAtomSchemas.verbForm.extract([
					"Inf",
					"Part",
				]),
				voice: abstractFeatureAtomSchemas.voice.extract([
					"Act",
					"Mid",
					"Pass",
				]),
			}),
		),
	})
	.strict() satisfies z.ZodSchema<HeVerbFeatures>;
