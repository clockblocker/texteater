import { z } from "zod";
import type { HeInterjectionFeatures } from "../../../../../types/concrete-language/features/he/lexeme/interjection.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const heInterjectionFeaturesSchema = z.strictObject({
	inherent: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<HeInterjectionFeatures>;
