import { z } from "zod/v3";
import type { HeDuplifixMorphemeFeatures } from "../../../../../types/concrete-language/features/he/morpheme/duplifix.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const heDuplifixMorphemeFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<HeDuplifixMorphemeFeatures>;
