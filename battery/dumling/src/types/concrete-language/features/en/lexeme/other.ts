import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog.js";

export type EnOtherFeatures = {
	inherent: {
		extPos: Extract<AbstractFeatureValue<"extPos">, "PROPN"> | null;
		foreign: AbstractFeatureValue<"foreign"> | null;
	};
	inflectional: Record<never, never>;
};
