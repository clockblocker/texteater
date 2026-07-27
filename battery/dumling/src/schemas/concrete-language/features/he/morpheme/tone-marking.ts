import { z } from "zod/v3";
import type { HeToneMarkingMorphemeFeatures } from "../../../../../types/concrete-language/features/he/morpheme/tone-marking.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const heToneMarkingMorphemeFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<HeToneMarkingMorphemeFeatures>;
