import { z } from "zod/v3";
import type { DeCliticMorphemeFeatures } from "../../../../../types/concrete-language/features/de/morpheme/clitic";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers";

export const deCliticMorphemeFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<DeCliticMorphemeFeatures>;
