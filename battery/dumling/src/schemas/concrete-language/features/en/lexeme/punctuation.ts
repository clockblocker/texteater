import { z } from "zod/v3";
import type { EnPunctuationFeatures } from "../../../../../types/concrete-language/features/en/lexeme/punctuation";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers";

export const enPunctuationFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<EnPunctuationFeatures>;
