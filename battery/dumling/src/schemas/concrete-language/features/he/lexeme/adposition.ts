import { z } from "zod";
import type { HeAdpositionFeatures } from "../../../../../types/concrete-language/features/he/lexeme/adposition.js";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const heAdpositionFeaturesSchema = z.strictObject({
	core: buildOptionalFeatureObjectSchema({
		abbr: abstractFeatureAtomSchemas.abbr,
		case: abstractFeatureAtomSchemas.case.extract(["Acc", "Gen"]),
	}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<HeAdpositionFeatures>;
