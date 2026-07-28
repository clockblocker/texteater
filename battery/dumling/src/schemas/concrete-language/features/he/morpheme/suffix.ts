import { z } from "zod";
import type { HeSuffixMorphemeFeatures } from "../../../../../types/concrete-language/features/he/morpheme/suffix.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const heSuffixMorphemeFeaturesSchema = z.strictObject({
	inherent: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<HeSuffixMorphemeFeatures>;
