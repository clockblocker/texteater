import { z } from "zod/v3";
import type { HeInterfixMorphemeFeatures } from "../../../../../types/concrete-language/features/he/morpheme/interfix";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers";

export const heInterfixMorphemeFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<HeInterfixMorphemeFeatures>;
