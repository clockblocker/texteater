import { z } from "zod";
import type { EnNumeralFeatures } from "../../../../../types/concrete-language/features/en/lexeme/numeral.js";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const enNumeralFeaturesSchema = z.strictObject({
	inherent: buildOptionalFeatureObjectSchema({
		abbr: abstractFeatureAtomSchemas.abbr,
		extPos: abstractFeatureAtomSchemas.extPos.extract(["PROPN"]),
		numForm: abstractFeatureAtomSchemas.numForm.extract([
			"Digit",
			"Roman",
			"Word",
		]),
		numType: abstractFeatureAtomSchemas.numType.extract(["Card", "Frac"]),
	}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<EnNumeralFeatures>;
