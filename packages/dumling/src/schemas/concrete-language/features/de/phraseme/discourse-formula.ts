import { z } from "zod/v3";
import type { DeDiscourseFormulaPhrasemeFeatures } from "../../../../../types/concrete-language/features/de/phraseme/discourse-formula";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers";

export const deDiscourseFormulaPhrasemeFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({
			discourseFormulaRole:
				abstractFeatureAtomSchemas.discourseFormulaRole,
		}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<DeDiscourseFormulaPhrasemeFeatures>;
