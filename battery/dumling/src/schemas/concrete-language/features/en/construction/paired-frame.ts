import { z } from "zod";
import type { EnConstructionPairedFrameFeatures } from "../../../../../types/concrete-language/features/en/construction/paired-frame.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const enConstructionPairedFrameFeaturesSchema = z.strictObject({
	inherent: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<EnConstructionPairedFrameFeatures>;
