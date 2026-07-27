import { z } from "zod/v3";
import type { DeIdiomPhrasemeFeatures } from "../../../../../types/concrete-language/features/de/phraseme/idiom";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers";

export const deIdiomPhrasemeFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<DeIdiomPhrasemeFeatures>;
