import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog.js";

export type EnCoordinatingConjunctionFeatures = {
	inherent: {
		abbr: AbstractFeatureValue<"abbr"> | null;
		polarity: Extract<AbstractFeatureValue<"polarity">, "Neg"> | null;
	};
	inflectional: Record<never, never>;
};
