import { z } from "zod/v3";
import type { HePronounFeatures } from "../../../../../types/concrete-language/features/he/lexeme/pronoun";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas";
import {
	buildOptionalFeatureObjectSchema,
	featureValueSet,
	requireNonEmptyFeatureObject,
} from "../../../../shared/feature-helpers";

export const hePronounFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({
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
				number: abstractFeatureAtomSchemas.number.extract([
					"Plur",
					"Sing",
				]),
				person: abstractFeatureAtomSchemas.person.extract([
					"1",
					"2",
					"3",
				]),
			}),
		),
	})
	.strict() satisfies z.ZodSchema<HePronounFeatures>;
