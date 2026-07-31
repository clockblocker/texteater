import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog.js";

export type EnParticleFeatures = {
	core: {
		abbr: AbstractFeatureValue<"abbr"> | null;
		extPos: Extract<AbstractFeatureValue<"extPos">, "CCONJ"> | null;
		polarity: Extract<AbstractFeatureValue<"polarity">, "Neg"> | null;
	};
	inflectional: Record<never, never>;
};
