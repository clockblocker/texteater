import { z } from "zod";
import type { DeToneMarkingMorphemeFeatures } from "../../../../../types/concrete-language/features/de/morpheme/tone-marking.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const deToneMarkingMorphemeFeaturesSchema = z.strictObject({
	core: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<DeToneMarkingMorphemeFeatures>;
