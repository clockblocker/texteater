import { z } from "zod/v3";
import type { EnProverbPhrasemeFeatures } from "../../../../../types/concrete-language/features/en/phraseme/proverb.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const enProverbPhrasemeFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<EnProverbPhrasemeFeatures>;
