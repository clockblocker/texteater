import { z } from "zod";
import type { DeIdiomPhrasemeFeatures } from "../../../../../types/concrete-language/features/de/phraseme/idiom.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";
import { deVerbInflectionalFeaturesSchema } from "../lexeme/verb.js";

export const deIdiomPhrasemeFeaturesSchema = z.strictObject({
	core: buildOptionalFeatureObjectSchema({}),
	inflectional: deVerbInflectionalFeaturesSchema,
}) satisfies z.ZodSchema<DeIdiomPhrasemeFeatures>;
