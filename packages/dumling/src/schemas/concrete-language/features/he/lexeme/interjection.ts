import { z } from "zod/v3";
import type { HeInterjectionFeatures } from "../../../../../types/concrete-language/features/he/lexeme/interjection";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers";

export const heInterjectionFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<HeInterjectionFeatures>;
