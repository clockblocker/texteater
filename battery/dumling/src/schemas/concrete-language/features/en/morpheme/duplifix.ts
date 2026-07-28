import { z } from "zod";
import type { EnDuplifixMorphemeFeatures } from "../../../../../types/concrete-language/features/en/morpheme/duplifix.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const enDuplifixMorphemeFeaturesSchema = z.strictObject({
	inherent: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<EnDuplifixMorphemeFeatures>;
