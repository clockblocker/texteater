import { z } from "zod";
import type { EnAdpositionFeatures } from "../../../../../types/concrete-language/features/en/lexeme/adposition.js";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const enAdpositionFeaturesSchema = z.strictObject({
	inherent: buildOptionalFeatureObjectSchema({
		abbr: abstractFeatureAtomSchemas.abbr,
		extPos: abstractFeatureAtomSchemas.extPos.extract([
			"ADP",
			"ADV",
			"SCONJ",
		]),
	}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<EnAdpositionFeatures>;
