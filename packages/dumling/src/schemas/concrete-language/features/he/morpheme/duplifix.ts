import { z } from "zod/v3";
import type { HeDuplifixMorphemeFeatures } from "../../../../../types/concrete-language/features/he/morpheme/duplifix";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers";

export const heDuplifixMorphemeFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<HeDuplifixMorphemeFeatures>;
