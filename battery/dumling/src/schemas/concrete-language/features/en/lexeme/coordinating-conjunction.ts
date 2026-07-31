import { z } from "zod";
import type { EnCoordinatingConjunctionFeatures } from "../../../../../types/concrete-language/features/en/lexeme/coordinating-conjunction.js";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const enCoordinatingConjunctionFeaturesSchema = z.strictObject({
	core: buildOptionalFeatureObjectSchema({
		abbr: abstractFeatureAtomSchemas.abbr,
		polarity: abstractFeatureAtomSchemas.polarity.extract(["Neg"]),
	}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<EnCoordinatingConjunctionFeatures>;
