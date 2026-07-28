import { z } from "zod";
import type { EnSuffixMorphemeFeatures } from "../../../../../types/concrete-language/features/en/morpheme/suffix.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const enSuffixMorphemeFeaturesSchema = z.strictObject({
	inherent: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<EnSuffixMorphemeFeatures>;
