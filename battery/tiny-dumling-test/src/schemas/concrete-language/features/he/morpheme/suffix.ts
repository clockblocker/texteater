import { z } from "zod";
import type { HeSuffixMorphemeFeatures } from "../../../../../types/concrete-language/features/he/morpheme/suffix.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const heSuffixMorphemeFeaturesSchema = z.strictObject({
	core: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<HeSuffixMorphemeFeatures>;
