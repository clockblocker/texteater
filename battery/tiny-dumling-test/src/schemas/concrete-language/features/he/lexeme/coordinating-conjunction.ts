import { z } from "zod";
import type { HeCoordinatingConjunctionFeatures } from "../../../../../types/concrete-language/features/he/lexeme/coordinating-conjunction.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const heCoordinatingConjunctionFeaturesSchema = z.strictObject({
	core: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<HeCoordinatingConjunctionFeatures>;
