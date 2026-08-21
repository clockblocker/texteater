import { z } from "zod";
import type { HeInfixMorphemeFeatures } from "../../../../../types/concrete-language/features/he/morpheme/infix.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const heInfixMorphemeFeaturesSchema = z.strictObject({
	core: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<HeInfixMorphemeFeatures>;
