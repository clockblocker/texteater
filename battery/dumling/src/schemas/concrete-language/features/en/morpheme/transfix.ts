import { z } from "zod/v3";
import type { EnTransfixMorphemeFeatures } from "../../../../../types/concrete-language/features/en/morpheme/transfix.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const enTransfixMorphemeFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<EnTransfixMorphemeFeatures>;
