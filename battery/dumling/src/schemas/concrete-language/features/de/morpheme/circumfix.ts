import { z } from "zod";
import type { DeCircumfixMorphemeFeatures } from "../../../../../types/concrete-language/features/de/morpheme/circumfix.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const deCircumfixMorphemeFeaturesSchema = z.strictObject({
	core: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<DeCircumfixMorphemeFeatures>;
