import { z } from "zod";
import type { HeAphorismPhrasemeFeatures } from "../../../../../types/concrete-language/features/he/phraseme/aphorism.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const heAphorismPhrasemeFeaturesSchema = z.strictObject({
	core: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<HeAphorismPhrasemeFeatures>;
