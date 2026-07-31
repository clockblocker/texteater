import { z } from "zod";
import type { HePrefixMorphemeFeatures } from "../../../../../types/concrete-language/features/he/morpheme/prefix.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const hePrefixMorphemeFeaturesSchema = z.strictObject({
	core: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<HePrefixMorphemeFeatures>;
