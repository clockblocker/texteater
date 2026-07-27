import { z } from "zod/v3";
import type { EnPrefixMorphemeFeatures } from "../../../../../types/concrete-language/features/en/morpheme/prefix";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers";

export const enPrefixMorphemeFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<EnPrefixMorphemeFeatures>;
