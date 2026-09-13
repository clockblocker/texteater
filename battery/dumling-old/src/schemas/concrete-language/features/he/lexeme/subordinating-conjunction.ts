import { z } from "zod";
import type { HeSubordinatingConjunctionFeatures } from "../../../../../types/concrete-language/features/he/lexeme/subordinating-conjunction.js";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const heSubordinatingConjunctionFeaturesSchema = z.strictObject({
	core: buildOptionalFeatureObjectSchema({
		case: abstractFeatureAtomSchemas.case.extract(["Tem"]),
	}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<HeSubordinatingConjunctionFeatures>;
