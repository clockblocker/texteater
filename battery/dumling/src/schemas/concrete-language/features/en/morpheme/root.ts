import { z } from "zod/v3";
import type { EnRootMorphemeFeatures } from "../../../../../types/concrete-language/features/en/morpheme/root";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers";

export const enRootMorphemeFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<EnRootMorphemeFeatures>;
