import { z } from "zod/v3";
import type { HeSubordinatingConjunctionFeatures } from "../../../../../types/concrete-language/features/he/lexeme/subordinating-conjunction.js";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const heSubordinatingConjunctionFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({
			case: abstractFeatureAtomSchemas.case.extract(["Tem"]),
		}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<HeSubordinatingConjunctionFeatures>;
