import { z } from "zod/v3";
import type { HeConstructionFusionFeatures } from "../../../../../types/concrete-language/features/he/construction/fusion";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers";

export const heConstructionFusionFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<HeConstructionFusionFeatures>;
