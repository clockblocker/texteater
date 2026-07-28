import { z } from "zod";
import type { HeCircumfixMorphemeFeatures } from "../../../../../types/concrete-language/features/he/morpheme/circumfix.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const heCircumfixMorphemeFeaturesSchema = z.strictObject({
	inherent: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<HeCircumfixMorphemeFeatures>;
