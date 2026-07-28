import { z } from "zod";
import type { EnTransfixMorphemeFeatures } from "../../../../../types/concrete-language/features/en/morpheme/transfix.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const enTransfixMorphemeFeaturesSchema = z.strictObject({
	inherent: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<EnTransfixMorphemeFeatures>;
