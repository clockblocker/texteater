import { z } from "zod/v3";
import type { HeCoordinatingConjunctionFeatures } from "../../../../../types/concrete-language/features/he/lexeme/coordinating-conjunction";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers";

export const heCoordinatingConjunctionFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<HeCoordinatingConjunctionFeatures>;
