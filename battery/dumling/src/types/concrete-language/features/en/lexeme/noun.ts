import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog.js";

export type EnNounFeatures = {
	inherent: {
		abbr: AbstractFeatureValue<"abbr"> | null;
		extPos: Extract<AbstractFeatureValue<"extPos">, "ADV" | "PROPN"> | null;
		foreign: AbstractFeatureValue<"foreign"> | null;
		numForm: Extract<
			AbstractFeatureValue<"numForm">,
			"Combi" | "Digit" | "Word"
		> | null;
		numType: Extract<
			AbstractFeatureValue<"numType">,
			"Card" | "Frac" | "Ord"
		> | null;
		style: Extract<AbstractFeatureValue<"style">, "Expr" | "Vrnc"> | null;
	};
	inflectional: {
		number: Extract<
			AbstractFeatureValue<"number">,
			"Plur" | "Ptan" | "Sing"
		> | null;
	};
};
