import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog.js";

export type EnCoordinatingConjunctionFeatures = {
	inherent: {
		abbr?: AbstractFeatureValue<"abbr">;
		polarity?: Extract<AbstractFeatureValue<"polarity">, "Neg">;
	};
	inflectional: Record<never, never>;
};
