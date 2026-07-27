import { z } from "zod/v3";
import type { EnDuplifixMorphemeFeatures } from "../../../../../types/concrete-language/features/en/morpheme/duplifix";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers";

export const enDuplifixMorphemeFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<EnDuplifixMorphemeFeatures>;
