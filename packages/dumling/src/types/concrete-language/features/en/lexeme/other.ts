import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog";

export type EnOtherFeatures = {
	inherent: {
		extPos?: Extract<AbstractFeatureValue<"extPos">, "PROPN">;
		foreign?: AbstractFeatureValue<"foreign">;
	};
	inflectional: Record<never, never>;
};
