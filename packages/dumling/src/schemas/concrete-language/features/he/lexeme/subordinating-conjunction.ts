import { z } from "zod/v3";
import type { HeSubordinatingConjunctionFeatures } from "../../../../../types/concrete-language/features/he/lexeme/subordinating-conjunction";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers";

export const heSubordinatingConjunctionFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({
			case: abstractFeatureAtomSchemas.case.extract(["Tem"]),
		}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<HeSubordinatingConjunctionFeatures>;
