import { z } from "zod";
import type { DeAphorismPhrasemeFeatures } from "../../../../../types/concrete-language/features/de/phraseme/aphorism.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const deAphorismPhrasemeFeaturesSchema = z.strictObject({
	inherent: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<DeAphorismPhrasemeFeatures>;
