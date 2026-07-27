import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog.js";

export type EnSymbolFeatures = {
	inherent: {
		abbr?: AbstractFeatureValue<"abbr">;
		extPos?: Extract<AbstractFeatureValue<"extPos">, "ADP" | "PROPN">;
	};
	inflectional: {
		number?: Extract<AbstractFeatureValue<"number">, "Plur" | "Sing">;
	};
};
