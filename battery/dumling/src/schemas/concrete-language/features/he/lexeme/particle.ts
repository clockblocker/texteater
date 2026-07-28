import { z } from "zod";
import type { HeParticleFeatures } from "../../../../../types/concrete-language/features/he/lexeme/particle.js";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers.js";

export const heParticleFeaturesSchema = z.strictObject({
	inherent: buildOptionalFeatureObjectSchema({}),
	inflectional: buildOptionalFeatureObjectSchema({}),
}) satisfies z.ZodSchema<HeParticleFeatures>;
