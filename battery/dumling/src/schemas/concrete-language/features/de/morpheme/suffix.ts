import { z } from "zod";
import type { DeSuffixMorphemeFeatures } from "../../../../../types/concrete-language/features/de/morpheme/suffix.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const deSuffixMorphemeFeaturesSchema = z.strictObject({
	inherent: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<DeSuffixMorphemeFeatures>;
