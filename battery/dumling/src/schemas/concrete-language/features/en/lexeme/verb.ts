import { z } from "zod/v3";
import type { EnVerbFeatures } from "../../../../../types/concrete-language/features/en/lexeme/verb";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas";
import {
	buildOptionalFeatureObjectSchema,
	requireNonEmptyFeatureObject,
} from "../../../../shared/feature-helpers";

export const enVerbFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({
			abbr: abstractFeatureAtomSchemas.abbr,
			extPos: abstractFeatureAtomSchemas.extPos.extract([
				"ADP",
				"CCONJ",
				"PROPN",
			]),
			hasGovPrep: abstractFeatureAtomSchemas.hasGovPrep,
			phrasal: abstractFeatureAtomSchemas.phrasal,
			style: abstractFeatureAtomSchemas.style.extract(["Expr", "Vrnc"]),
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
					"Ger",
					"Inf",
					"Part",
				]),
				voice: abstractFeatureAtomSchemas.voice.extract(["Pass"]),
			}),
		),
	})
	.strict() satisfies z.ZodSchema<EnVerbFeatures>;
