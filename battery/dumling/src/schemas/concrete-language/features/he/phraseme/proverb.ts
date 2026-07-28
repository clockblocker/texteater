import { z } from "zod";
import type { HeProverbPhrasemeFeatures } from "../../../../../types/concrete-language/features/he/phraseme/proverb.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const heProverbPhrasemeFeaturesSchema = z.strictObject({
	inherent: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<HeProverbPhrasemeFeatures>;
