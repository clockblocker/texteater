import { z } from "zod/v3";
import type { HeInfixMorphemeFeatures } from "../../../../../types/concrete-language/features/he/morpheme/infix";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers";

export const heInfixMorphemeFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<HeInfixMorphemeFeatures>;
