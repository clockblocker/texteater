import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog.js";

export type DeProperNounFeatures = {
	core: {
		abbr: AbstractFeatureValue<"abbr"> | null;
		foreign: AbstractFeatureValue<"foreign"> | null;
		gender: Extract<
			AbstractFeatureValue<"gender">,
			"Fem" | "Masc" | "Neut"
		> | null;
	};
	inflectional: {
		case: Extract<
			AbstractFeatureValue<"case">,
			"Acc" | "Dat" | "Gen" | "Nom"
		> | null;
		number: Extract<AbstractFeatureValue<"number">, "Plur" | "Sing"> | null;
	};
};
