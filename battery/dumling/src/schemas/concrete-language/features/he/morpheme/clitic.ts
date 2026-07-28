import { z } from "zod";
import type { HeCliticMorphemeFeatures } from "../../../../../types/concrete-language/features/he/morpheme/clitic.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const heCliticMorphemeFeaturesSchema = z.strictObject({
	inherent: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<HeCliticMorphemeFeatures>;
