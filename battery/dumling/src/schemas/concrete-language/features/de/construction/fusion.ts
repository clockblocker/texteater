import { z } from "zod/v3";
import type { DeConstructionFusionFeatures } from "../../../../../types/concrete-language/features/de/construction/fusion.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const deConstructionFusionFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<DeConstructionFusionFeatures>;
