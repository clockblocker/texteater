import { z } from "zod/v3";
import type { DeToneMarkingMorphemeFeatures } from "../../../../../types/concrete-language/features/de/morpheme/tone-marking.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const deToneMarkingMorphemeFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<DeToneMarkingMorphemeFeatures>;
