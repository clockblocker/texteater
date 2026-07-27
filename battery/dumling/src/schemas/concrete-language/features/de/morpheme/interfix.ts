import { z } from "zod/v3";
import type { DeInterfixMorphemeFeatures } from "../../../../../types/concrete-language/features/de/morpheme/interfix.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const deInterfixMorphemeFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<DeInterfixMorphemeFeatures>;
