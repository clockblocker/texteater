import { z } from "zod/v3";
import type { HeAuxiliaryFeatures } from "../../../../../types/concrete-language/features/he/lexeme/auxiliary";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas";
import {
	buildOptionalFeatureObjectSchema,
	featureValueSet,
	requireNonEmptyFeatureObject,
} from "../../../../shared/feature-helpers";

export const heAuxiliaryFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({
			verbType: abstractFeatureAtomSchemas.verbType.extract([
				"Cop",
				"Mod",
			]),
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
			}),
		),
	})
	.strict() satisfies z.ZodSchema<HeAuxiliaryFeatures>;
