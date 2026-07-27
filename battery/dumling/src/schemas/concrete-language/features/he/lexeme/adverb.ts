import { z } from "zod/v3";
import type { HeAdverbFeatures } from "../../../../../types/concrete-language/features/he/lexeme/adverb.js";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const heAdverbFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({
			prefix: abstractFeatureAtomSchemas.prefix,
		}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<HeAdverbFeatures>;
