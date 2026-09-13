import { z } from "zod";
import type { HeAdverbFeatures } from "../../../../../types/concrete-language/features/he/lexeme/adverb.js";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const heAdverbFeaturesSchema = z.strictObject({
	core: buildOptionalFeatureObjectSchema({
		prefix: abstractFeatureAtomSchemas.prefix,
	}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<HeAdverbFeatures>;
