import { z } from "zod/v3";
import type { HeParticleFeatures } from "../../../../../types/concrete-language/features/he/lexeme/particle";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers";

export const heParticleFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<HeParticleFeatures>;
