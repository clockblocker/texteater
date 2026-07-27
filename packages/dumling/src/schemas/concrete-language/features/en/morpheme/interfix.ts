import { z } from "zod/v3";
import type { EnInterfixMorphemeFeatures } from "../../../../../types/concrete-language/features/en/morpheme/interfix";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers";

export const enInterfixMorphemeFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<EnInterfixMorphemeFeatures>;
