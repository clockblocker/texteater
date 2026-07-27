import { z } from "zod/v3";
import type { HeTransfixMorphemeFeatures } from "../../../../../types/concrete-language/features/he/morpheme/transfix.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const heTransfixMorphemeFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<HeTransfixMorphemeFeatures>;
