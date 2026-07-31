import { z } from "zod";
import type { DeConstructionPairedFrameFeatures } from "../../../../../types/concrete-language/features/de/construction/paired-frame.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const deConstructionPairedFrameFeaturesSchema = z.strictObject({
	core: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<DeConstructionPairedFrameFeatures>;
