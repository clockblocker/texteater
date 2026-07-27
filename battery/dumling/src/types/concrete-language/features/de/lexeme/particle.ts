import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog.js";

export type DeParticleFeatures = {
	inherent: {
		abbr?: AbstractFeatureValue<"abbr">;
		foreign?: AbstractFeatureValue<"foreign">;
		partType?: Extract<AbstractFeatureValue<"partType">, "Inf">;
		polarity?: Extract<AbstractFeatureValue<"polarity">, "Neg" | "Pos">;
	};
	inflectional: Record<never, never>;
};
