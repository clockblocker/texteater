import { z } from "zod";
import type { DeInterjectionFeatures } from "../../../../../types/concrete-language/features/de/lexeme/interjection.js";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const deInterjectionFeaturesSchema = z.strictObject({
	core: buildOptionalFeatureObjectSchema({
		partType: abstractFeatureAtomSchemas.partType.extract(["Res"]),
	}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<DeInterjectionFeatures>;
