import { z } from "zod";
import type { EnCliticMorphemeFeatures } from "../../../../../types/concrete-language/features/en/morpheme/clitic.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const enCliticMorphemeFeaturesSchema = z.strictObject({
	inherent: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<EnCliticMorphemeFeatures>;
