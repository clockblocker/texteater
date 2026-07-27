import { z } from "zod/v3";
import type { HeAphorismPhrasemeFeatures } from "../../../../../types/concrete-language/features/he/phraseme/aphorism.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const heAphorismPhrasemeFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<HeAphorismPhrasemeFeatures>;
