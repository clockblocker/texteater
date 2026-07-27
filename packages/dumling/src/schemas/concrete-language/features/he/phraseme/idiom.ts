import { z } from "zod/v3";
import type { HeIdiomPhrasemeFeatures } from "../../../../../types/concrete-language/features/he/phraseme/idiom";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers";

export const heIdiomPhrasemeFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<HeIdiomPhrasemeFeatures>;
