import { z } from "zod";
import type { DePrefixMorphemeFeatures } from "../../../../../types/concrete-language/features/de/morpheme/prefix.js";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const dePrefixMorphemeFeaturesSchema = z.strictObject({
	core: buildOptionalFeatureObjectSchema({
		hasSepPrefix: abstractFeatureAtomSchemas.hasSepPrefix,
	}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<DePrefixMorphemeFeatures>;
