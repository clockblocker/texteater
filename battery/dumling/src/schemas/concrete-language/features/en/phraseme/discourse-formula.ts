import { z } from "zod";
import type { EnDiscourseFormulaPhrasemeFeatures } from "../../../../../types/concrete-language/features/en/phraseme/discourse-formula.js";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const enDiscourseFormulaPhrasemeFeaturesSchema = z.strictObject({
	core: buildOptionalFeatureObjectSchema({
		discourseFormulaRole: abstractFeatureAtomSchemas.discourseFormulaRole,
	}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<EnDiscourseFormulaPhrasemeFeatures>;
