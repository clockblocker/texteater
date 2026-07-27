import { z } from "zod/v3";
import type { EnToneMarkingMorphemeFeatures } from "../../../../../types/concrete-language/features/en/morpheme/tone-marking";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers";

export const enToneMarkingMorphemeFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<EnToneMarkingMorphemeFeatures>;
