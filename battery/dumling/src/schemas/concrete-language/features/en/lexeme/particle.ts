import { z } from "zod";
import type { EnParticleFeatures } from "../../../../../types/concrete-language/features/en/lexeme/particle.js";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const enParticleFeaturesSchema = z.strictObject({
	inherent: buildOptionalFeatureObjectSchema({
		abbr: abstractFeatureAtomSchemas.abbr,
		extPos: abstractFeatureAtomSchemas.extPos.extract(["CCONJ"]),
		polarity: abstractFeatureAtomSchemas.polarity.extract(["Neg"]),
	}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<EnParticleFeatures>;
