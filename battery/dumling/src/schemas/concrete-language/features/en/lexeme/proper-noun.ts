import { z } from "zod";
import type { EnProperNounFeatures } from "../../../../../types/concrete-language/features/en/lexeme/proper-noun.js";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas.js";
import {
	buildOptionalFeatureObjectSchema,
	requireNonEmptyFeatureObject,
} from "../../../../shared/feature-helpers.js";

export const enProperNounFeaturesSchema = z.strictObject({
	inherent: buildOptionalFeatureObjectSchema({
		abbr: abstractFeatureAtomSchemas.abbr,
		extPos: abstractFeatureAtomSchemas.extPos.extract(["PROPN"]),
		style: abstractFeatureAtomSchemas.style.extract(["Expr"]),
	}),
	inflectional: requireNonEmptyFeatureObject(
		buildOptionalFeatureObjectSchema({
			number: abstractFeatureAtomSchemas.number.extract([
				"Plur",
				"Ptan",
				"Sing",
			]),
		}),
	),
}) satisfies z.ZodSchema<EnProperNounFeatures>;
