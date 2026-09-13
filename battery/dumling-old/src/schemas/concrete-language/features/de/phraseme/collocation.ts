import { z } from "zod";
import type { DeCollocationPhrasemeFeatures } from "../../../../../types/concrete-language/features/de/phraseme/collocation.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";
import { deVerbInflectionalFeaturesSchema } from "../lexeme/verb.js";

export const deCollocationPhrasemeFeaturesSchema = z.strictObject({
	core: buildOptionalFeatureObjectSchema({}),
	inflectional: deVerbInflectionalFeaturesSchema,
}) satisfies z.ZodSchema<DeCollocationPhrasemeFeatures>;
