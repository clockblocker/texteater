import { z } from "zod";
import type { EnAphorismPhrasemeFeatures } from "../../../../../types/concrete-language/features/en/phraseme/aphorism.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const enAphorismPhrasemeFeaturesSchema = z.strictObject({
	inherent: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<EnAphorismPhrasemeFeatures>;
