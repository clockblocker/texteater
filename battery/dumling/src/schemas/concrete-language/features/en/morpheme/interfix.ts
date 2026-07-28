import { z } from "zod";
import type { EnInterfixMorphemeFeatures } from "../../../../../types/concrete-language/features/en/morpheme/interfix.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const enInterfixMorphemeFeaturesSchema = z.strictObject({
	inherent: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<EnInterfixMorphemeFeatures>;
