import { z } from "zod/v3";
import type { EnProperNounFeatures } from "../../../../../types/concrete-language/features/en/lexeme/proper-noun";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas";
import {
	buildOptionalFeatureObjectSchema,
	requireNonEmptyFeatureObject,
} from "../../../../shared/feature-helpers";

export const enProperNounFeaturesSchema = z
	.object({
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
	})
	.strict() satisfies z.ZodSchema<EnProperNounFeatures>;
