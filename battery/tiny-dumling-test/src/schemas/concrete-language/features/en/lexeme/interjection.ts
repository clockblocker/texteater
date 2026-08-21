import { z } from "zod";
import type { EnInterjectionFeatures } from "../../../../../types/concrete-language/features/en/lexeme/interjection.js";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const enInterjectionFeaturesSchema = z.strictObject({
	core: buildOptionalFeatureObjectSchema({
		abbr: abstractFeatureAtomSchemas.abbr,
		foreign: abstractFeatureAtomSchemas.foreign,
		polarity: abstractFeatureAtomSchemas.polarity.extract(["Neg", "Pos"]),
		style: abstractFeatureAtomSchemas.style.extract(["Expr"]),
	}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<EnInterjectionFeatures>;
