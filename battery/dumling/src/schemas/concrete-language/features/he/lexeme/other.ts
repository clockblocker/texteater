import { z } from "zod";
import type { HeOtherFeatures } from "../../../../../types/concrete-language/features/he/lexeme/other.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const heOtherFeaturesSchema = z.strictObject({
	inherent: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<HeOtherFeatures>;
