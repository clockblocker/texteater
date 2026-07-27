import { z } from "zod/v3";
import type { EnParticleFeatures } from "../../../../../types/concrete-language/features/en/lexeme/particle";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas";
import { buildOptionalFeatureObjectSchema } from "../../../../shared/feature-helpers";

export const enParticleFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({
			abbr: abstractFeatureAtomSchemas.abbr,
			extPos: abstractFeatureAtomSchemas.extPos.extract(["CCONJ"]),
			polarity: abstractFeatureAtomSchemas.polarity.extract(["Neg"]),
		}),
		inflectional: buildOptionalFeatureObjectSchema({}),
	})
	.strict() satisfies z.ZodSchema<EnParticleFeatures>;
