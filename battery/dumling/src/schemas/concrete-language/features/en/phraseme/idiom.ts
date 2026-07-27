import { z } from "zod/v3";
import type { EnIdiomPhrasemeFeatures } from "../../../../../types/concrete-language/features/en/phraseme/idiom.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const enIdiomPhrasemeFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<EnIdiomPhrasemeFeatures>;
