import { z } from "zod/v3";
import type { EnAuxiliaryFeatures } from "../../../../../types/concrete-language/features/en/lexeme/auxiliary";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas";
import {
	buildOptionalFeatureObjectSchema,
	requireNonEmptyFeatureObject,
} from "../../../../shared/feature-helpers";

export const enAuxiliaryFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({
			abbr: abstractFeatureAtomSchemas.abbr,
			style: abstractFeatureAtomSchemas.style.extract(["Arch", "Vrnc"]),
		}),
		inflectional: requireNonEmptyFeatureObject(
			buildOptionalFeatureObjectSchema({
				mood: abstractFeatureAtomSchemas.mood.extract([
					"Imp",
					"Ind",
					"Sub",
				]),
				number: abstractFeatureAtomSchemas.number.extract([
					"Plur",
					"Sing",
				]),
				person: abstractFeatureAtomSchemas.person.extract([
					"1",
					"2",
					"3",
				]),
				tense: abstractFeatureAtomSchemas.tense.extract([
					"Past",
					"Pres",
				]),
				verbForm: abstractFeatureAtomSchemas.verbForm.extract([
					"Fin",
					"Inf",
					"Part",
				]),
			}),
		),
	})
	.strict() satisfies z.ZodSchema<EnAuxiliaryFeatures>;
