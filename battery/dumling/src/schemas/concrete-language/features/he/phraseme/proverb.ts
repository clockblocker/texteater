import { z } from "zod/v3";
import type { HeProverbPhrasemeFeatures } from "../../../../../types/concrete-language/features/he/phraseme/proverb.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const heProverbPhrasemeFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<HeProverbPhrasemeFeatures>;
