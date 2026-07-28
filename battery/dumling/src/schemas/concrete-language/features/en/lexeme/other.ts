import { z } from "zod";
import type { EnOtherFeatures } from "../../../../../types/concrete-language/features/en/lexeme/other.js";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const enOtherFeaturesSchema = z.strictObject({
	inherent: buildOptionalFeatureObjectSchema({
		extPos: abstractFeatureAtomSchemas.extPos.extract(["PROPN"]),
		foreign: abstractFeatureAtomSchemas.foreign,
	}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<EnOtherFeatures>;
