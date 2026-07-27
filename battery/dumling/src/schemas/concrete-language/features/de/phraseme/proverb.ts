import { z } from "zod/v3";
import type { DeProverbPhrasemeFeatures } from "../../../../../types/concrete-language/features/de/phraseme/proverb";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers";

export const deProverbPhrasemeFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<DeProverbPhrasemeFeatures>;
