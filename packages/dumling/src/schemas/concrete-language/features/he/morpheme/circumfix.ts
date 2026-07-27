import { z } from "zod/v3";
import type { HeCircumfixMorphemeFeatures } from "../../../../../types/concrete-language/features/he/morpheme/circumfix";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers";

export const heCircumfixMorphemeFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<HeCircumfixMorphemeFeatures>;
