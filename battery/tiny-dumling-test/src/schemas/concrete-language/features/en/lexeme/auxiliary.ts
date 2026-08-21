import { z } from "zod";
import type { EnAuxiliaryFeatures } from "../../../../../types/concrete-language/features/en/lexeme/auxiliary.js";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas.js";
import {
	buildOptionalFeatureObjectSchema,
	requireNonEmptyFeatureObject,
} from "../../../../shared/feature-helpers.js";

export const enAuxiliaryFeaturesSchema = z.strictObject({
	core: buildOptionalFeatureObjectSchema({
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
			number: abstractFeatureAtomSchemas.number.extract(["Plur", "Sing"]),
			person: abstractFeatureAtomSchemas.person.extract(["1", "2", "3"]),
			tense: abstractFeatureAtomSchemas.tense.extract(["Past", "Pres"]),
			verbForm: abstractFeatureAtomSchemas.verbForm.extract([
				"Fin",
				"Inf",
				"Part",
			]),
		}),
	),
}) satisfies z.ZodSchema<EnAuxiliaryFeatures>;
