import { z } from "zod/v3";
import type { DeRootMorphemeFeatures } from "../../../../../types/concrete-language/features/de/morpheme/root";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers";

export const deRootMorphemeFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<DeRootMorphemeFeatures>;
