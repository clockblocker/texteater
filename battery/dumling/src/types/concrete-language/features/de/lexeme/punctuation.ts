import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog.js";

export type DePunctuationFeatures = {
	core: {
		punctType: AbstractFeatureValue<"punctType"> | null;
	};
	inflectional: Record<never, never>;
};
