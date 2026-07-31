import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog.js";

export type EnProperNounFeatures = {
	core: {
		abbr: AbstractFeatureValue<"abbr"> | null;
		extPos: Extract<AbstractFeatureValue<"extPos">, "PROPN"> | null;
		style: Extract<AbstractFeatureValue<"style">, "Expr"> | null;
	};
	inflectional: {
		number: Extract<
			AbstractFeatureValue<"number">,
			"Plur" | "Ptan" | "Sing"
		> | null;
	};
};
