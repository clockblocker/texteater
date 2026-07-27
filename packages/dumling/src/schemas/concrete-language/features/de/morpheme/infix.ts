import { z } from "zod/v3";
import type { DeInfixMorphemeFeatures } from "../../../../../types/concrete-language/features/de/morpheme/infix";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers";

export const deInfixMorphemeFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<DeInfixMorphemeFeatures>;
