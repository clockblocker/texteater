import { z } from "zod/v3";
import type { DePunctuationFeatures } from "../../../../../types/concrete-language/features/de/lexeme/punctuation.js";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const dePunctuationFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({
			punctType: abstractFeatureAtomSchemas.punctType,
		}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<DePunctuationFeatures>;
