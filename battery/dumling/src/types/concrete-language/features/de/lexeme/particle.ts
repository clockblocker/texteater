import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog.js";

export type DeParticleFeatures = {
	inherent: {
		abbr: AbstractFeatureValue<"abbr"> | null;
		foreign: AbstractFeatureValue<"foreign"> | null;
		partType: Extract<AbstractFeatureValue<"partType">, "Inf"> | null;
		polarity: Extract<
			AbstractFeatureValue<"polarity">,
			"Neg" | "Pos"
		> | null;
	};
	inflectional: Record<never, never>;
};
