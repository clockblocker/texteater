import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog.js";

export type DePrefixMorphemeFeatures = {
	inherent: {
		hasSepPrefix?: AbstractFeatureValue<"hasSepPrefix">;
	};
	inflectional: Record<never, never>;
};
