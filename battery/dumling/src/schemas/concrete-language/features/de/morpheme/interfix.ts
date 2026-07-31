import { z } from "zod";
import type { DeInterfixMorphemeFeatures } from "../../../../../types/concrete-language/features/de/morpheme/interfix.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const deInterfixMorphemeFeaturesSchema = z.strictObject({
	core: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<DeInterfixMorphemeFeatures>;
