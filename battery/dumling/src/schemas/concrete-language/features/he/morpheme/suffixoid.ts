import { z } from "zod";
import type { HeSuffixoidMorphemeFeatures } from "../../../../../types/concrete-language/features/he/morpheme/suffixoid.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const heSuffixoidMorphemeFeaturesSchema = z.strictObject({
	inherent: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<HeSuffixoidMorphemeFeatures>;
