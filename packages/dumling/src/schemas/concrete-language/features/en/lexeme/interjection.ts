import { z } from "zod/v3";
import type { EnInterjectionFeatures } from "../../../../../types/concrete-language/features/en/lexeme/interjection";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers";

export const enInterjectionFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({
			abbr: abstractFeatureAtomSchemas.abbr,
			foreign: abstractFeatureAtomSchemas.foreign,
			polarity: abstractFeatureAtomSchemas.polarity.extract([
				"Neg",
				"Pos",
			]),
			style: abstractFeatureAtomSchemas.style.extract(["Expr"]),
		}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<EnInterjectionFeatures>;
