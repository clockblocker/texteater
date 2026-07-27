import { z } from "zod/v3";
import type { HeTransfixMorphemeFeatures } from "../../../../../types/concrete-language/features/he/morpheme/transfix";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers";

export const heTransfixMorphemeFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<HeTransfixMorphemeFeatures>;
