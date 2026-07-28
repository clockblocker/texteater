import { z } from "zod";
import type { DeProverbPhrasemeFeatures } from "../../../../../types/concrete-language/features/de/phraseme/proverb.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const deProverbPhrasemeFeaturesSchema = z.strictObject({
	inherent: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<DeProverbPhrasemeFeatures>;
