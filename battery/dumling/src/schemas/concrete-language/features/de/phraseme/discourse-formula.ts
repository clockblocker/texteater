import { z } from "zod";
import type { DeDiscourseFormulaPhrasemeFeatures } from "../../../../../types/concrete-language/features/de/phraseme/discourse-formula.js";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const deDiscourseFormulaPhrasemeFeaturesSchema = z.strictObject({
	inherent: buildOptionalFeatureObjectSchema({
		discourseFormulaRole: abstractFeatureAtomSchemas.discourseFormulaRole,
	}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<DeDiscourseFormulaPhrasemeFeatures>;
