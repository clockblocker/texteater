import { z } from "zod";
import type { HeToneMarkingMorphemeFeatures } from "../../../../../types/concrete-language/features/he/morpheme/tone-marking.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const heToneMarkingMorphemeFeaturesSchema = z.strictObject({
	inherent: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<HeToneMarkingMorphemeFeatures>;
