import { z } from "zod/v3";
import type { HeAdpositionFeatures } from "../../../../../types/concrete-language/features/he/lexeme/adposition";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers";

export const heAdpositionFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({
			abbr: abstractFeatureAtomSchemas.abbr,
			case: abstractFeatureAtomSchemas.case.extract(["Acc", "Gen"]),
		}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<HeAdpositionFeatures>;
