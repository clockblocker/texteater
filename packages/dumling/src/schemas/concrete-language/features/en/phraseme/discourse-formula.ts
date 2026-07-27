import { z } from "zod/v3";
import type { EnDiscourseFormulaPhrasemeFeatures } from "../../../../../types/concrete-language/features/en/phraseme/discourse-formula";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers";

export const enDiscourseFormulaPhrasemeFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({
			discourseFormulaRole:
				abstractFeatureAtomSchemas.discourseFormulaRole,
		}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<EnDiscourseFormulaPhrasemeFeatures>;
