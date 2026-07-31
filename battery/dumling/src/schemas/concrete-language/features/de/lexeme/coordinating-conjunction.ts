import { z } from "zod";
import type { DeCoordinatingConjunctionFeatures } from "../../../../../types/concrete-language/features/de/lexeme/coordinating-conjunction.js";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const deCoordinatingConjunctionFeaturesSchema = z.strictObject({
	core: buildOptionalFeatureObjectSchema({
		conjType: abstractFeatureAtomSchemas.conjType.extract(["Comp"]),
	}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<DeCoordinatingConjunctionFeatures>;
