import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog.js";

export type EnCoordinatingConjunctionFeatures = {
	core: {
		abbr: AbstractFeatureValue<"abbr"> | null;
		polarity: Extract<AbstractFeatureValue<"polarity">, "Neg"> | null;
	};
	inflectional: Record<never, never>;
};
