import { z } from "zod";
import type { DeRootMorphemeFeatures } from "../../../../../types/concrete-language/features/de/morpheme/root.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const deRootMorphemeFeaturesSchema = z.strictObject({
	inherent: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<DeRootMorphemeFeatures>;
