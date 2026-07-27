import { z } from "zod/v3";
import type { HeInterfixMorphemeFeatures } from "../../../../../types/concrete-language/features/he/morpheme/interfix.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const heInterfixMorphemeFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<HeInterfixMorphemeFeatures>;
