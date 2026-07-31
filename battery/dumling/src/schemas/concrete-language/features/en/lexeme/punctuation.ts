import { z } from "zod";
import type { EnPunctuationFeatures } from "../../../../../types/concrete-language/features/en/lexeme/punctuation.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const enPunctuationFeaturesSchema = z.strictObject({
	core: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<EnPunctuationFeatures>;
