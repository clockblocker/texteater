import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog.js";

export type HeAdverbFeatures = {
	core: {
		prefix: AbstractFeatureValue<"prefix"> | null;
	};
	inflectional: Record<never, never>;
};
