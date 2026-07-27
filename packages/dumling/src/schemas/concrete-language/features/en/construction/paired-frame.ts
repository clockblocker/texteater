import { z } from "zod/v3";
import type { EnConstructionPairedFrameFeatures } from "../../../../../types/concrete-language/features/en/construction/paired-frame";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers";

export const enConstructionPairedFrameFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<EnConstructionPairedFrameFeatures>;
