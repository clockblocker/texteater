import { z } from "zod";
import type { EnIdiomPhrasemeFeatures } from "../../../../../types/concrete-language/features/en/phraseme/idiom.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const enIdiomPhrasemeFeaturesSchema = z.strictObject({
	inherent: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<EnIdiomPhrasemeFeatures>;
