import { z } from "zod";
import type { EnCircumfixMorphemeFeatures } from "../../../../../types/concrete-language/features/en/morpheme/circumfix.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const enCircumfixMorphemeFeaturesSchema = z.strictObject({
	core: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<EnCircumfixMorphemeFeatures>;
