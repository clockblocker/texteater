import { z } from "zod/v3";
import type { HePunctuationFeatures } from "../../../../../types/concrete-language/features/he/lexeme/punctuation.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const hePunctuationFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<HePunctuationFeatures>;
