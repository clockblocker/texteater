import { z } from "zod";
import type { EnDeterminerFeatures } from "../../../../../types/concrete-language/features/en/lexeme/determiner.js";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas.js";
import {
	buildOptionalFeatureObjectSchema,
	featureValueSet,
	requireNonEmptyFeatureObject,
} from "../../../../shared/feature-helpers.js";

export const enDeterminerFeaturesSchema = z.strictObject({
	inherent: buildOptionalFeatureObjectSchema({
		abbr: abstractFeatureAtomSchemas.abbr,
		definite: abstractFeatureAtomSchemas.definite.extract(["Def", "Ind"]),
		extPos: abstractFeatureAtomSchemas.extPos.extract(["ADV", "PRON"]),
		numForm: abstractFeatureAtomSchemas.numForm.extract(["Word"]),
		numType: abstractFeatureAtomSchemas.numType.extract(["Frac"]),
		pronType: featureValueSet(
			abstractFeatureAtomSchemas.pronType.extract([
				"Art",
				"Dem",
				"Ind",
				"Int",
				"Neg",
				"Rcp",
				"Rel",
				"Tot",
			]),
		),
		style: abstractFeatureAtomSchemas.style.extract(["Vrnc"]),
	}),
	inflectional: requireNonEmptyFeatureObject(
		buildOptionalFeatureObjectSchema({
			number: abstractFeatureAtomSchemas.number.extract(["Plur", "Sing"]),
		}),
	),
}) satisfies z.ZodSchema<EnDeterminerFeatures>;
