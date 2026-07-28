import { z } from "zod";
import type { EnConstructionFusionFeatures } from "../../../../../types/concrete-language/features/en/construction/fusion.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const enConstructionFusionFeaturesSchema = z.strictObject({
	inherent: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<EnConstructionFusionFeatures>;
