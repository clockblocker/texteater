import { z } from "zod";
import type { HeTransfixMorphemeFeatures } from "../../../../../types/concrete-language/features/he/morpheme/transfix.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const heTransfixMorphemeFeaturesSchema = z.strictObject({
	inherent: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<HeTransfixMorphemeFeatures>;
