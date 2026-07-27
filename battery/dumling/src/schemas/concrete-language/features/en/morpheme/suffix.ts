import { z } from "zod/v3";
import type { EnSuffixMorphemeFeatures } from "../../../../../types/concrete-language/features/en/morpheme/suffix.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const enSuffixMorphemeFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<EnSuffixMorphemeFeatures>;
