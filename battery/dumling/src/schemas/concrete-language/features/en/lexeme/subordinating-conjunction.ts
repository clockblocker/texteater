import { z } from "zod/v3";
import type { EnSubordinatingConjunctionFeatures } from "../../../../../types/concrete-language/features/en/lexeme/subordinating-conjunction.js";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const enSubordinatingConjunctionFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({
			abbr: abstractFeatureAtomSchemas.abbr,
			extPos: abstractFeatureAtomSchemas.extPos.extract(["ADP", "SCONJ"]),
			style: abstractFeatureAtomSchemas.style.extract(["Vrnc"]),
		}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<EnSubordinatingConjunctionFeatures>;
