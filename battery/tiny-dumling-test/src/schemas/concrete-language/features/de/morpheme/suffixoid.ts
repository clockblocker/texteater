import { z } from "zod";
import type { DeSuffixoidMorphemeFeatures } from "../../../../../types/concrete-language/features/de/morpheme/suffixoid.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const deSuffixoidMorphemeFeaturesSchema = z.strictObject({
	core: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<DeSuffixoidMorphemeFeatures>;
