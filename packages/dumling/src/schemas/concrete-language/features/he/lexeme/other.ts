import { z } from "zod/v3";
import type { HeOtherFeatures } from "../../../../../types/concrete-language/features/he/lexeme/other";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers";

export const heOtherFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<HeOtherFeatures>;
