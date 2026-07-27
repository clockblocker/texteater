import { z } from "zod/v3";
import type { HeInterjectionFeatures } from "../../../../../types/concrete-language/features/he/lexeme/interjection.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const heInterjectionFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<HeInterjectionFeatures>;
