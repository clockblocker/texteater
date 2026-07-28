import { z } from "zod";
import type { EnPrefixMorphemeFeatures } from "../../../../../types/concrete-language/features/en/morpheme/prefix.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const enPrefixMorphemeFeaturesSchema = z.strictObject({
	inherent: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<EnPrefixMorphemeFeatures>;
