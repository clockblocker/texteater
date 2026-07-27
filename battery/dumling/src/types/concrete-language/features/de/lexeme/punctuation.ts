import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog";

export type DePunctuationFeatures = {
	inherent: {
		punctType?: AbstractFeatureValue<"punctType">;
	};
	inflectional: Record<never, never>;
};
