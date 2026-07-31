import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog.js";

export type HeSubordinatingConjunctionFeatures = {
	core: {
		case: Extract<AbstractFeatureValue<"case">, "Tem"> | null;
	};
	inflectional: Record<never, never>;
};
