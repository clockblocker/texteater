import { z } from "zod";
import type { DeTransfixMorphemeFeatures } from "../../../../../types/concrete-language/features/de/morpheme/transfix.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const deTransfixMorphemeFeaturesSchema = z.strictObject({
	core: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<DeTransfixMorphemeFeatures>;
