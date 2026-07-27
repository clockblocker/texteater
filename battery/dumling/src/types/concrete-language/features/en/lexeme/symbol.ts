import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog";

export type EnSymbolFeatures = {
	inherent: {
		abbr?: AbstractFeatureValue<"abbr">;
		extPos?: Extract<AbstractFeatureValue<"extPos">, "ADP" | "PROPN">;
	};
	inflectional: {
		number?: Extract<AbstractFeatureValue<"number">, "Plur" | "Sing">;
	};
};
