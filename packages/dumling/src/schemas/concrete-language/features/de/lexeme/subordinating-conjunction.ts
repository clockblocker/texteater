import { z } from "zod/v3";
import type { DeSubordinatingConjunctionFeatures } from "../../../../../types/concrete-language/features/de/lexeme/subordinating-conjunction";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers";

export const deSubordinatingConjunctionFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({
			conjType: abstractFeatureAtomSchemas.conjType.extract(["Comp"]),
		}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<DeSubordinatingConjunctionFeatures>;
