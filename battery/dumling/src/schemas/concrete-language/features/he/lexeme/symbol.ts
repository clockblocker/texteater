import { z } from "zod/v3";
import type { HeSymbolFeatures } from "../../../../../types/concrete-language/features/he/lexeme/symbol";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers";

export const heSymbolFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<HeSymbolFeatures>;
