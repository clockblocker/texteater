import { z } from "zod/v3";
import type { HeDiscourseFormulaPhrasemeFeatures } from "../../../../../types/concrete-language/features/he/phraseme/discourse-formula";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers";

export const heDiscourseFormulaPhrasemeFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<HeDiscourseFormulaPhrasemeFeatures>;
