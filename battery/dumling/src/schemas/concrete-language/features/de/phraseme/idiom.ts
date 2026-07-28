import { z } from "zod";
import type { DeIdiomPhrasemeFeatures } from "../../../../../types/concrete-language/features/de/phraseme/idiom.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const deIdiomPhrasemeFeaturesSchema = z.strictObject({
	inherent: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<DeIdiomPhrasemeFeatures>;
