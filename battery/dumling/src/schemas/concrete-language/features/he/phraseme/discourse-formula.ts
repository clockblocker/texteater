import { z } from "zod";
import type { HeDiscourseFormulaPhrasemeFeatures } from "../../../../../types/concrete-language/features/he/phraseme/discourse-formula.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const heDiscourseFormulaPhrasemeFeaturesSchema = z.strictObject({
	inherent: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<HeDiscourseFormulaPhrasemeFeatures>;
