import { z } from "zod/v3";
import type { HeConstructionPairedFrameFeatures } from "../../../../../types/concrete-language/features/he/construction/paired-frame";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers";

export const heConstructionPairedFrameFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<HeConstructionPairedFrameFeatures>;
