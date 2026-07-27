import { z } from "zod/v3";
import type { HePrefixMorphemeFeatures } from "../../../../../types/concrete-language/features/he/morpheme/prefix";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers";

export const hePrefixMorphemeFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<HePrefixMorphemeFeatures>;
