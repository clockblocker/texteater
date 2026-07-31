import { z } from "zod";
import type { DeInfixMorphemeFeatures } from "../../../../../types/concrete-language/features/de/morpheme/infix.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const deInfixMorphemeFeaturesSchema = z.strictObject({
	core: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<DeInfixMorphemeFeatures>;
