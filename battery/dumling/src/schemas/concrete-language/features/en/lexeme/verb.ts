import { z } from "zod";
import type { EnVerbFeatures } from "../../../../../types/concrete-language/features/en/lexeme/verb.js";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas.js";
import {
	buildOptionalFeatureObjectSchema,
	requireNonEmptyFeatureObject,
} from "../../../../shared/feature-helpers.js";

export const enVerbFeaturesSchema = z.strictObject({
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
			number: abstractFeatureAtomSchemas.number.extract(["Plur", "Sing"]),
			person: abstractFeatureAtomSchemas.person.extract(["1", "2", "3"]),
			tense: abstractFeatureAtomSchemas.tense.extract(["Past", "Pres"]),
			verbForm: abstractFeatureAtomSchemas.verbForm.extract([
				"Fin",
				"Ger",
				"Inf",
				"Part",
			]),
			voice: abstractFeatureAtomSchemas.voice.extract(["Pass"]),
		}),
	),
}) satisfies z.ZodSchema<EnVerbFeatures>;
