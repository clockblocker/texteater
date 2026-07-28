import { z } from "zod";
import type { DeSubordinatingConjunctionFeatures } from "../../../../../types/concrete-language/features/de/lexeme/subordinating-conjunction.js";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const deSubordinatingConjunctionFeaturesSchema = z.strictObject({
	inherent: buildOptionalFeatureObjectSchema({
		conjType: abstractFeatureAtomSchemas.conjType.extract(["Comp"]),
	}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<DeSubordinatingConjunctionFeatures>;
