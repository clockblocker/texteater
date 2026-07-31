import { z } from "zod";
import type { EnInfixMorphemeFeatures } from "../../../../../types/concrete-language/features/en/morpheme/infix.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const enInfixMorphemeFeaturesSchema = z.strictObject({
	core: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<EnInfixMorphemeFeatures>;
