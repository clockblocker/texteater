import { z } from "zod";
import type { HePunctuationFeatures } from "../../../../../types/concrete-language/features/he/lexeme/punctuation.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const hePunctuationFeaturesSchema = z.strictObject({
	core: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<HePunctuationFeatures>;
