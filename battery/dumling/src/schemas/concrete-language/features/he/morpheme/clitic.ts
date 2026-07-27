import { z } from "zod/v3";
import type { HeCliticMorphemeFeatures } from "../../../../../types/concrete-language/features/he/morpheme/clitic";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers";

export const heCliticMorphemeFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<HeCliticMorphemeFeatures>;
