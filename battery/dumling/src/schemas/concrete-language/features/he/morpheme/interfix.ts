import { z } from "zod";
import type { HeInterfixMorphemeFeatures } from "../../../../../types/concrete-language/features/he/morpheme/interfix.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const heInterfixMorphemeFeaturesSchema = z.strictObject({
	inherent: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<HeInterfixMorphemeFeatures>;
