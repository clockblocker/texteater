import { z } from "zod/v3";
import type { EnCliticMorphemeFeatures } from "../../../../../types/concrete-language/features/en/morpheme/clitic";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers";

export const enCliticMorphemeFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<EnCliticMorphemeFeatures>;
