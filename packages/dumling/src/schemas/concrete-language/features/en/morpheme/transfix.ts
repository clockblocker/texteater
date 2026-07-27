import { z } from "zod/v3";
import type { EnTransfixMorphemeFeatures } from "../../../../../types/concrete-language/features/en/morpheme/transfix";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers";

export const enTransfixMorphemeFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<EnTransfixMorphemeFeatures>;
