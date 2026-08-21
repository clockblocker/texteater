import { z } from "zod";
import type { EnSuffixoidMorphemeFeatures } from "../../../../../types/concrete-language/features/en/morpheme/suffixoid.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const enSuffixoidMorphemeFeaturesSchema = z.strictObject({
	core: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<EnSuffixoidMorphemeFeatures>;
