import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog";

export type HeSubordinatingConjunctionFeatures = {
	inherent: {
		case?: Extract<AbstractFeatureValue<"case">, "Tem">;
	};
	inflectional: Record<never, never>;
};
