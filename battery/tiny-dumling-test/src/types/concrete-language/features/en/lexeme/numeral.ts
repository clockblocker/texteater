import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog.js";

export type EnNumeralFeatures = {
	core: {
		abbr: AbstractFeatureValue<"abbr"> | null;
		extPos: Extract<AbstractFeatureValue<"extPos">, "PROPN"> | null;
		numForm: Extract<
			AbstractFeatureValue<"numForm">,
			"Digit" | "Roman" | "Word"
		> | null;
		numType: Extract<
			AbstractFeatureValue<"numType">,
			"Card" | "Frac"
		> | null;
	};
	inflectional: Record<never, never>;
};
