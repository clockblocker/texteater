import { z } from "zod/v3";
import type { HeSuffixMorphemeFeatures } from "../../../../../types/concrete-language/features/he/morpheme/suffix";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers";

export const heSuffixMorphemeFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<HeSuffixMorphemeFeatures>;
