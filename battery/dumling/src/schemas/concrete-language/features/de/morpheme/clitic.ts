import { z } from "zod";
import type { DeCliticMorphemeFeatures } from "../../../../../types/concrete-language/features/de/morpheme/clitic.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const deCliticMorphemeFeaturesSchema = z.strictObject({
	inherent: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<DeCliticMorphemeFeatures>;
