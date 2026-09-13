import { z } from "zod";
import type { EnRootMorphemeFeatures } from "../../../../../types/concrete-language/features/en/morpheme/root.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const enRootMorphemeFeaturesSchema = z.strictObject({
	core: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<EnRootMorphemeFeatures>;
