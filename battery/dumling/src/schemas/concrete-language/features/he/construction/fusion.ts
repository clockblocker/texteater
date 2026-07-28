import { z } from "zod";
import type { HeConstructionFusionFeatures } from "../../../../../types/concrete-language/features/he/construction/fusion.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const heConstructionFusionFeaturesSchema = z.strictObject({
	inherent: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<HeConstructionFusionFeatures>;
