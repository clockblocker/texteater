import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog.js";

export type EnSubordinatingConjunctionFeatures = {
	inherent: {
		abbr: AbstractFeatureValue<"abbr"> | null;
		extPos: Extract<AbstractFeatureValue<"extPos">, "ADP" | "SCONJ"> | null;
		style: Extract<AbstractFeatureValue<"style">, "Vrnc"> | null;
	};
	inflectional: Record<never, never>;
};
