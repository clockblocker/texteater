import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog.js";

export type EnParticleFeatures = {
	inherent: {
		abbr?: AbstractFeatureValue<"abbr">;
		extPos?: Extract<AbstractFeatureValue<"extPos">, "CCONJ">;
		polarity?: Extract<AbstractFeatureValue<"polarity">, "Neg">;
	};
	inflectional: Record<never, never>;
};
