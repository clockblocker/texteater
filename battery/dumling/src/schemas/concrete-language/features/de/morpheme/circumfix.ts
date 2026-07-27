import { z } from "zod/v3";
import type { DeCircumfixMorphemeFeatures } from "../../../../../types/concrete-language/features/de/morpheme/circumfix.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const deCircumfixMorphemeFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<DeCircumfixMorphemeFeatures>;
