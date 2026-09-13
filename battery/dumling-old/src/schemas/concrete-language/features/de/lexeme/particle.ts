import { z } from "zod";
import type { DeParticleFeatures } from "../../../../../types/concrete-language/features/de/lexeme/particle.js";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const deParticleFeaturesSchema = z.strictObject({
	core: buildOptionalFeatureObjectSchema({
		abbr: abstractFeatureAtomSchemas.abbr,
		foreign: abstractFeatureAtomSchemas.foreign,
		partType: abstractFeatureAtomSchemas.partType.extract(["Inf"]),
		polarity: abstractFeatureAtomSchemas.polarity.extract(["Neg", "Pos"]),
	}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<DeParticleFeatures>;
