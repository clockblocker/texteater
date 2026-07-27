import { z } from "zod/v3";
import type { DePrefixMorphemeFeatures } from "../../../../../types/concrete-language/features/de/morpheme/prefix.js";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const dePrefixMorphemeFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({
			hasSepPrefix: abstractFeatureAtomSchemas.hasSepPrefix,
		}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<DePrefixMorphemeFeatures>;
