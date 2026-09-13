import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog.js";

export type EnSymbolFeatures = {
	core: {
		abbr: AbstractFeatureValue<"abbr"> | null;
		extPos: Extract<AbstractFeatureValue<"extPos">, "ADP" | "PROPN"> | null;
	};
	inflectional: {
		number: Extract<AbstractFeatureValue<"number">, "Plur" | "Sing"> | null;
	};
};
