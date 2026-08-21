import { z } from "zod";
import type { DeRootMorphemeFeatures } from "../../../../../types/concrete-language/features/de/morpheme/root.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const deRootMorphemeFeaturesSchema = z.strictObject({
	core: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<DeRootMorphemeFeatures>;
