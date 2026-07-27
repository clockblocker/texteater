import { z } from "zod/v3";
import type { DeInterjectionFeatures } from "../../../../../types/concrete-language/features/de/lexeme/interjection.js";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const deInterjectionFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({
			partType: abstractFeatureAtomSchemas.partType.extract(["Res"]),
		}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<DeInterjectionFeatures>;
