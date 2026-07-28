import { z } from "zod";
import type { DeDuplifixMorphemeFeatures } from "../../../../../types/concrete-language/features/de/morpheme/duplifix.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const deDuplifixMorphemeFeaturesSchema = z.strictObject({
	inherent: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<DeDuplifixMorphemeFeatures>;
