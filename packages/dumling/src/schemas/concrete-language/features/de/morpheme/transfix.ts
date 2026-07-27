import { z } from "zod/v3";
import type { DeTransfixMorphemeFeatures } from "../../../../../types/concrete-language/features/de/morpheme/transfix";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers";

export const deTransfixMorphemeFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<DeTransfixMorphemeFeatures>;
