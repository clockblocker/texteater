import { z } from "zod/v3";
import type { EnSuffixoidMorphemeFeatures } from "../../../../../types/concrete-language/features/en/morpheme/suffixoid";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers";

export const enSuffixoidMorphemeFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<EnSuffixoidMorphemeFeatures>;
