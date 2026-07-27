import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog";

export type DeSubordinatingConjunctionFeatures = {
	inherent: {
		conjType?: Extract<AbstractFeatureValue<"conjType">, "Comp">;
	};
	inflectional: Record<never, never>;
};
