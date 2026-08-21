import { z } from "zod";
import type { DeAdpositionFeatures } from "../../../../../types/concrete-language/features/de/lexeme/adposition.js";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const deAdpositionFeaturesSchema = z.strictObject({
	core: buildOptionalFeatureObjectSchema({
		abbr: abstractFeatureAtomSchemas.abbr,
		adpType: abstractFeatureAtomSchemas.adpType.extract([
			"Circ",
			"Post",
			"Prep",
		]),
		extPos: abstractFeatureAtomSchemas.extPos.extract(["ADV", "SCONJ"]),
		foreign: abstractFeatureAtomSchemas.foreign,
		governedCase: abstractFeatureAtomSchemas.governedCase,
		partType: abstractFeatureAtomSchemas.partType.extract(["Vbp"]),
	}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<DeAdpositionFeatures>;
