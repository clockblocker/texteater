import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog.js";

export type DeNumeralFeatures = {
	inherent: {
		abbr: AbstractFeatureValue<"abbr"> | null;
		foreign: AbstractFeatureValue<"foreign"> | null;
		numType: Extract<
			AbstractFeatureValue<"numType">,
			"Card" | "Frac" | "Mult" | "Range"
		> | null;
	};
	inflectional: {
		case: Extract<
			AbstractFeatureValue<"case">,
			"Acc" | "Dat" | "Gen" | "Nom"
		> | null;
		gender: Extract<
			AbstractFeatureValue<"gender">,
			"Fem" | "Masc" | "Neut"
		> | null;
		number: Extract<AbstractFeatureValue<"number">, "Plur" | "Sing"> | null;
	};
};
