import { z } from "zod";
import type { EnSubordinatingConjunctionFeatures } from "../../../../../types/concrete-language/features/en/lexeme/subordinating-conjunction.js";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const enSubordinatingConjunctionFeaturesSchema = z.strictObject({
	inherent: buildOptionalFeatureObjectSchema({
		abbr: abstractFeatureAtomSchemas.abbr,
		extPos: abstractFeatureAtomSchemas.extPos.extract(["ADP", "SCONJ"]),
		style: abstractFeatureAtomSchemas.style.extract(["Vrnc"]),
	}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<EnSubordinatingConjunctionFeatures>;
