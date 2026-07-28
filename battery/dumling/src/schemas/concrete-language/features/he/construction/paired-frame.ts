import { z } from "zod";
import type { HeConstructionPairedFrameFeatures } from "../../../../../types/concrete-language/features/he/construction/paired-frame.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const heConstructionPairedFrameFeaturesSchema = z.strictObject({
	inherent: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<HeConstructionPairedFrameFeatures>;
