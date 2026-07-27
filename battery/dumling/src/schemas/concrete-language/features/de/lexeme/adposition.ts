import { z } from "zod/v3";
import type { DeAdpositionFeatures } from "../../../../../types/concrete-language/features/de/lexeme/adposition.js";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const deAdpositionFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({
			abbr: abstractFeatureAtomSchemas.abbr,
			adpType: abstractFeatureAtomSchemas.adpType.extract([
				"Circ",
				"Post",
				"Prep",
			]),
			extPos: abstractFeatureAtomSchemas.extPos.extract(["ADV", "SCONJ"]),
			foreign: abstractFeatureAtomSchemas.foreign,
			governedCase: abstractFeatureAtomSchemas.governedCase,
			partType: abstractFeatureAtomSchemas.partType.extract(["Vbp"]),
		}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<DeAdpositionFeatures>;
