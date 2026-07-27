import { z } from "zod/v3";
import type { EnCoordinatingConjunctionFeatures } from "../../../../../types/concrete-language/features/en/lexeme/coordinating-conjunction";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers";

export const enCoordinatingConjunctionFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({
			abbr: abstractFeatureAtomSchemas.abbr,
			polarity: abstractFeatureAtomSchemas.polarity.extract(["Neg"]),
		}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<EnCoordinatingConjunctionFeatures>;
