import { z } from "zod";
import type { HeRootMorphemeFeatures } from "../../../../../types/concrete-language/features/he/morpheme/root.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const heRootMorphemeFeaturesSchema = z.strictObject({
	inherent: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<HeRootMorphemeFeatures>;
