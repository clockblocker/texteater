import { z } from "zod/v3";
import type { HeAphorismPhrasemeFeatures } from "../../../../../types/concrete-language/features/he/phraseme/aphorism";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers";

export const heAphorismPhrasemeFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<HeAphorismPhrasemeFeatures>;
