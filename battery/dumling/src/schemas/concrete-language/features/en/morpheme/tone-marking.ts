import { z } from "zod";
import type { EnToneMarkingMorphemeFeatures } from "../../../../../types/concrete-language/features/en/morpheme/tone-marking.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const enToneMarkingMorphemeFeaturesSchema = z.strictObject({
	inherent: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<EnToneMarkingMorphemeFeatures>;
