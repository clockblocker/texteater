import { z } from "zod/v3";
import type { EnNumeralFeatures } from "../../../../../types/concrete-language/features/en/lexeme/numeral";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers";

export const enNumeralFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({
			abbr: abstractFeatureAtomSchemas.abbr,
			extPos: abstractFeatureAtomSchemas.extPos.extract(["PROPN"]),
			numForm: abstractFeatureAtomSchemas.numForm.extract([
				"Digit",
				"Roman",
				"Word",
			]),
			numType: abstractFeatureAtomSchemas.numType.extract([
				"Card",
				"Frac",
			]),
		}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<EnNumeralFeatures>;
