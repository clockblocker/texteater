import { z } from "zod/v3";
import type { DePunctuationFeatures } from "../../../../../types/concrete-language/features/de/lexeme/punctuation";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers";

export const dePunctuationFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({
			punctType: abstractFeatureAtomSchemas.punctType,
		}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<DePunctuationFeatures>;
