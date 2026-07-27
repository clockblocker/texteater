import { z } from "zod/v3";
import type { HeAdpositionFeatures } from "../../../../../types/concrete-language/features/he/lexeme/adposition.js";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const heAdpositionFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({
			abbr: abstractFeatureAtomSchemas.abbr,
			case: abstractFeatureAtomSchemas.case.extract(["Acc", "Gen"]),
		}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<HeAdpositionFeatures>;
