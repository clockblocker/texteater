import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog";

export type DeNumeralFeatures = {
	inherent: {
		abbr?: AbstractFeatureValue<"abbr">;
		foreign?: AbstractFeatureValue<"foreign">;
		numType?: Extract<
			AbstractFeatureValue<"numType">,
			"Card" | "Frac" | "Mult" | "Range"
		>;
	};
	inflectional: {
		case?: Extract<
			AbstractFeatureValue<"case">,
			"Acc" | "Dat" | "Gen" | "Nom"
		>;
		gender?: Extract<
			AbstractFeatureValue<"gender">,
			"Fem" | "Masc" | "Neut"
		>;
		number?: Extract<AbstractFeatureValue<"number">, "Plur" | "Sing">;
	};
};
