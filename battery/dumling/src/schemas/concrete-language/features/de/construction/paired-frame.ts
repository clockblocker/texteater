import { z } from "zod/v3";
import type { DeConstructionPairedFrameFeatures } from "../../../../../types/concrete-language/features/de/construction/paired-frame.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const deConstructionPairedFrameFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<DeConstructionPairedFrameFeatures>;
