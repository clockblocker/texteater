import { z } from "zod";
import type { HeDuplifixMorphemeFeatures } from "../../../../../types/concrete-language/features/he/morpheme/duplifix.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const heDuplifixMorphemeFeaturesSchema = z.strictObject({
	core: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<HeDuplifixMorphemeFeatures>;
