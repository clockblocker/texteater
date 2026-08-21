import { z } from "zod";
import type { DePunctuationFeatures } from "../../../../../types/concrete-language/features/de/lexeme/punctuation.js";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const dePunctuationFeaturesSchema = z.strictObject({
	core: buildOptionalFeatureObjectSchema({
		punctType: abstractFeatureAtomSchemas.punctType,
	}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<DePunctuationFeatures>;
