import { z } from "zod";
import type { DeConstructionFusionFeatures } from "../../../../../types/concrete-language/features/de/construction/fusion.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const deConstructionFusionFeaturesSchema = z.strictObject({
	inherent: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<DeConstructionFusionFeatures>;
