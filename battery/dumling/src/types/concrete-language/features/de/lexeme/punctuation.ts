import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog.js";

export type DePunctuationFeatures = {
	inherent: {
		punctType?: AbstractFeatureValue<"punctType">;
	};
	inflectional: Record<never, never>;
};
