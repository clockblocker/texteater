import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog.js";

export type DeSubordinatingConjunctionFeatures = {
	core: {
		conjType: Extract<AbstractFeatureValue<"conjType">, "Comp"> | null;
	};
	inflectional: Record<never, never>;
};
