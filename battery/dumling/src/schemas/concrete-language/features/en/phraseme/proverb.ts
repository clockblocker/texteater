import { z } from "zod";
import type { EnProverbPhrasemeFeatures } from "../../../../../types/concrete-language/features/en/phraseme/proverb.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const enProverbPhrasemeFeaturesSchema = z.strictObject({
	inherent: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<EnProverbPhrasemeFeatures>;
