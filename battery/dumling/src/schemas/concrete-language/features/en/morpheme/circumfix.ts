import { z } from "zod/v3";
import type { EnCircumfixMorphemeFeatures } from "../../../../../types/concrete-language/features/en/morpheme/circumfix.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const enCircumfixMorphemeFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<EnCircumfixMorphemeFeatures>;
