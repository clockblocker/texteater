import { z } from "zod/v3";
import type { EnAdpositionFeatures } from "../../../../../types/concrete-language/features/en/lexeme/adposition";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers";

export const enAdpositionFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({
			abbr: abstractFeatureAtomSchemas.abbr,
			extPos: abstractFeatureAtomSchemas.extPos.extract([
				"ADP",
				"ADV",
				"SCONJ",
			]),
		}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<EnAdpositionFeatures>;
