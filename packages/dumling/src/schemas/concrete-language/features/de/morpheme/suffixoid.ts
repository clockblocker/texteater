import { z } from "zod/v3";
import type { DeSuffixoidMorphemeFeatures } from "../../../../../types/concrete-language/features/de/morpheme/suffixoid";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers";

export const deSuffixoidMorphemeFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<DeSuffixoidMorphemeFeatures>;
