import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog.js";

export type EnProperNounFeatures = {
	inherent: {
		abbr?: AbstractFeatureValue<"abbr">;
		extPos?: Extract<AbstractFeatureValue<"extPos">, "PROPN">;
		style?: Extract<AbstractFeatureValue<"style">, "Expr">;
	};
	inflectional: {
		number?: Extract<
			AbstractFeatureValue<"number">,
			"Plur" | "Ptan" | "Sing"
		>;
	};
};
