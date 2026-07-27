import { z } from "zod/v3";
import type { DeDuplifixMorphemeFeatures } from "../../../../../types/concrete-language/features/de/morpheme/duplifix.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const deDuplifixMorphemeFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<DeDuplifixMorphemeFeatures>;
