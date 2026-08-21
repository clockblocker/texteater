import { z } from "zod";
import type { HeIdiomPhrasemeFeatures } from "../../../../../types/concrete-language/features/he/phraseme/idiom.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const heIdiomPhrasemeFeaturesSchema = z.strictObject({
	core: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<HeIdiomPhrasemeFeatures>;
