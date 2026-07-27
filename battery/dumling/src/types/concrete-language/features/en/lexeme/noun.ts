import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog";

export type EnNounFeatures = {
	inherent: {
		abbr?: AbstractFeatureValue<"abbr">;
		extPos?: Extract<AbstractFeatureValue<"extPos">, "ADV" | "PROPN">;
		foreign?: AbstractFeatureValue<"foreign">;
		numForm?: Extract<
			AbstractFeatureValue<"numForm">,
			"Combi" | "Digit" | "Word"
		>;
		numType?: Extract<
			AbstractFeatureValue<"numType">,
			"Card" | "Frac" | "Ord"
		>;
		style?: Extract<AbstractFeatureValue<"style">, "Expr" | "Vrnc">;
	};
	inflectional: {
		number?: Extract<
			AbstractFeatureValue<"number">,
			"Plur" | "Ptan" | "Sing"
		>;
	};
};
