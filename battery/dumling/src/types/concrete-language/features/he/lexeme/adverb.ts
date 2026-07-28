import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog.js";

export type HeAdverbFeatures = {
	inherent: {
		prefix: AbstractFeatureValue<"prefix"> | null;
	};
	inflectional: Record<never, never>;
};
