import { z } from "zod";
import type { HeSymbolFeatures } from "../../../../../types/concrete-language/features/he/lexeme/symbol.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const heSymbolFeaturesSchema = z.strictObject({
	inherent: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<HeSymbolFeatures>;
