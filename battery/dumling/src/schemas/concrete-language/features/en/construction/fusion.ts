import { z } from "zod/v3";
import type { EnConstructionFusionFeatures } from "../../../../../types/concrete-language/features/en/construction/fusion.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const enConstructionFusionFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<EnConstructionFusionFeatures>;
