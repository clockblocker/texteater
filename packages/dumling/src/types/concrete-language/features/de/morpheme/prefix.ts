import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog";

export type DePrefixMorphemeFeatures = {
	inherent: {
		hasSepPrefix?: AbstractFeatureValue<"hasSepPrefix">;
	};
	inflectional: Record<never, never>;
};
