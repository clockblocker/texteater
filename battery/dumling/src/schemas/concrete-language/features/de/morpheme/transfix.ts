import { z } from "zod/v3";
import type { DeTransfixMorphemeFeatures } from "../../../../../types/concrete-language/features/de/morpheme/transfix.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const deTransfixMorphemeFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<DeTransfixMorphemeFeatures>;
