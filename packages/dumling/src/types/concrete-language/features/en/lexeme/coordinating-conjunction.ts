import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog";

export type EnCoordinatingConjunctionFeatures = {
	inherent: {
		abbr?: AbstractFeatureValue<"abbr">;
		polarity?: Extract<AbstractFeatureValue<"polarity">, "Neg">;
	};
	inflectional: Record<never, never>;
};
