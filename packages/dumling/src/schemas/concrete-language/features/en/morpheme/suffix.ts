import { z } from "zod/v3";
import type { EnSuffixMorphemeFeatures } from "../../../../../types/concrete-language/features/en/morpheme/suffix";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers";

export const enSuffixMorphemeFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<EnSuffixMorphemeFeatures>;
