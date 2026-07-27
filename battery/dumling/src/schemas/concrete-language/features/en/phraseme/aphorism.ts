import { z } from "zod/v3";
import type { EnAphorismPhrasemeFeatures } from "../../../../../types/concrete-language/features/en/phraseme/aphorism";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers";

export const enAphorismPhrasemeFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<EnAphorismPhrasemeFeatures>;
